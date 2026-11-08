package com.hedefyks;

import static org.junit.jupiter.api.Assertions.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.sql.*;
import java.util.HexFormat;
import org.junit.jupiter.api.Test;

class YksEvidenceArchiveTest {
    Connection open() throws Exception {
        String url = System.getenv("YKS_TEST_DB_URL");
        assertNotNull(url);
        assertTrue(url.endsWith("/ivme_test"));
        Connection c = DriverManager.getConnection(url, System.getenv("YKS_DB_KULLANICI"), System.getenv("YKS_DB_SIFRE"));
        assertEquals("ivme_test", c.getCatalog());
        try (Statement s = c.createStatement()) {
            s.execute(Files.readString(Path.of(System.getenv("IVME_YKS_EVIDENCE_SCHEMA"))));
        }
        return c;
    }
    String sha(byte[] data) throws Exception { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data)); }
    int insert(Connection c, byte[] data, String hash) throws Exception {
        try (PreparedStatement p = c.prepareStatement("INSERT INTO yks_evidence.artifacts(sha256,byte_count,content) VALUES(?,?,?) ON CONFLICT DO NOTHING")) {
            p.setString(1, hash); p.setLong(2, data.length); p.setBytes(3, data); return p.executeUpdate();
        }
    }
    @Test void rawSourceBytesAndRepeatedInsertAreLossless() throws Exception {
        try (Connection c = open()) {
            byte[] data = "native\0√ıİ – incomplete model response [".getBytes(StandardCharsets.UTF_8);
            String hash = sha(data);
            assertEquals(1,insert(c,data,hash));
            assertEquals(0,insert(c,data,hash));
            try (PreparedStatement p=c.prepareStatement("SELECT content,byte_count FROM yks_evidence.artifacts WHERE sha256=?")) {
                p.setString(1,hash);try(ResultSet r=p.executeQuery()) { assertTrue(r.next()); assertArrayEquals(data,r.getBytes(1)); assertEquals(data.length,r.getLong(2)); }
            }
        }
    }
    @Test void wrongHashAndForeignReferencesAreRejected() throws Exception {
        try(Connection c=open()) {
            assertThrows(SQLException.class,()->insert(c,new byte[]{1,2,3},"0".repeat(64)));
            try(Statement s=c.createStatement()) {
                assertThrows(SQLException.class,()->s.executeUpdate("INSERT INTO yks_evidence.checkpoint_files VALUES('"+"1".repeat(64)+"','source.json','"+"2".repeat(64)+"','TEST')"));
            }
        }
    }
    @Test void incompleteCheckpointAndArtifactsRollbackTogether() throws Exception {
        try(Connection c=open()) {
            byte[] data="unique rollback artifact".getBytes(StandardCharsets.UTF_8);String hash=sha(data);
            c.setAutoCommit(false);
            insert(c,data,hash);
            try(PreparedStatement p=c.prepareStatement("INSERT INTO yks_evidence.checkpoints VALUES(?,?,?,'ARCHIVED','{}',now())")) {
                p.setString(1,hash);p.setString(2,"temporary-checkpoint");p.setString(3,hash);assertEquals(1,p.executeUpdate());
            }
            c.rollback();
            try(PreparedStatement p=c.prepareStatement("SELECT (SELECT count(*) FROM yks_evidence.artifacts WHERE sha256=?)+(SELECT count(*) FROM yks_evidence.checkpoints WHERE checkpoint_sha256=?)")) {
                p.setString(1,hash);p.setString(2,hash);try(ResultSet r=p.executeQuery()) {assertTrue(r.next());assertEquals(0,r.getInt(1));}
            }
        }
    }
}
