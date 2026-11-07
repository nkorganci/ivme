"""A private, password-authenticated loopback PostgreSQL cluster for restore proof.

It never changes production roles, extension privileges or authentication files.
"""
import os
from pathlib import Path
import secrets
import shutil
import socket
import subprocess
import uuid

from yks_birlestirme import write_json
from yks_stages.database import run_logged


class PrivateRestoreCluster:
    def __init__(self, bin_dir, evidence_folder):
        self.bin_dir = Path(bin_dir)
        self.folder = Path(evidence_folder)
        self.base = (Path(os.environ['LOCALAPPDATA']) / 'ivme-yks-restore').resolve()
        self.directory = self.base / ('restore-' + uuid.uuid4().hex)
        self.data = self.directory / 'data'
        self.password = secrets.token_urlsafe(32)
        self.started = False

    def __enter__(self):
        if not self.directory.resolve().is_relative_to(self.base) or self.directory.exists():
            raise ValueError('Invalid private restore directory')
        self.directory.mkdir(parents=True)
        password_file = self.directory / 'init-password.tmp'
        password_file.write_text(self.password, encoding='utf-8')
        try:
            run_logged([str(self.bin_dir / 'initdb.exe'), '--pgdata', str(self.data), '--username', 'yks_restore',
                        '--encoding=UTF8', '--locale=C', '--auth-host=scram-sha-256', '--auth-local=trust',
                        '--pwfile', str(password_file), '--no-instructions'], os.environ.copy(),
                       self.folder / 'private-cluster-init.log', timeout=120)
        finally:
            password_file.unlink(missing_ok=True)
        with socket.socket() as probe:
            probe.bind(('127.0.0.1', 0))
            self.port = probe.getsockname()[1]
        try:
            run_logged([str(self.bin_dir / 'pg_ctl.exe'), '-D', str(self.data), '-l', str(self.folder / 'private-postgres.log'),
                        '-o', f'-h 127.0.0.1 -p {self.port}', '-w', '-t', '60', 'start'],
                       os.environ.copy(), self.folder / 'private-cluster-start.log', timeout=90)
            self.started = True
            self.pid = (self.data / 'postmaster.pid').read_text().splitlines()[0]
        except BaseException:
            # pg_ctl may have started a server before a client-side timeout.
            if (self.data / 'postmaster.pid').exists():
                self.started = True
                self.pid = (self.data / 'postmaster.pid').read_text().splitlines()[0]
                self.stop()
            raise
        env = os.environ.copy()
        env.update(PGPASSWORD=self.password, PGCLIENTENCODING='UTF8', PGCONNECT_TIMEOUT='5')
        self.connection = ([str(self.bin_dir / 'psql.exe'), '-X', '--no-password', '--set=ON_ERROR_STOP=1',
                           '--host', '127.0.0.1', '--port', str(self.port), '--username', 'yks_restore', '--dbname', 'ivme_test'], env)
        write_json(self.folder / 'private-cluster.json', {'isolated': True, 'host': '127.0.0.1', 'port': self.port,
                                                         'directory': str(self.directory), 'pid': self.pid,
                                                         'credentialsPersisted': False})
        return self

    def stop(self):
        if not self.started:
            return
        path = (self.data / 'postmaster.pid')
        if not path.exists() or path.read_text().splitlines()[0] != self.pid:
            raise RuntimeError('Private restore server identity changed; stop refused')
        run_logged([str(self.bin_dir / 'pg_ctl.exe'), '-D', str(self.data), '-m', 'fast', '-w', '-t', '60', 'stop'],
                   os.environ.copy(), self.folder / 'private-cluster-stop.log', timeout=90)
        self.started = False

    def __exit__(self, kind, value, traceback):
        self.stop()
        removed = False
        if kind is None:
            target = self.directory.resolve()
            if target == self.base or not target.is_relative_to(self.base) or (self.data / 'postmaster.pid').exists():
                raise ValueError('Unsafe private restore cleanup target')
            # Only our stopped, UUID-named temporary cluster inside the verified
            # explicit base is recursively removed. Backups are elsewhere.
            shutil.rmtree(target)
            removed = True
        write_json(self.folder / 'private-cluster-cleanup.json', {'serverStopped': not self.started,
                                                                'directoryRemoved': removed,
                                                                'productionClusterChanged': False})
