"""Vectorized exact/perceptual image candidate retrieval; never an equivalence decision."""
from collections import defaultdict
import numpy as np

BITS=np.array([i.bit_count() for i in range(256)],dtype=np.uint8)


class VisualCandidates:
    def __init__(self,images):
        self.images=images
        self.hashes=np.array([int(r['phash'],16) for r in images],dtype=np.uint64)
        self.files=defaultdict(set);self.normalized=defaultdict(set)
        for i,row in enumerate(images):
            self.files[row['fileSha256']].add(i);self.normalized[row['normalizedSha256']].add(i)

    def __call__(self,fp):
        difference=(self.hashes^np.uint64(int(fp['phash'],16))).view(np.uint8).reshape(-1,8)
        distances=BITS[difference].sum(axis=1)
        exact=self.files.get(fp['fileSha256'],set())|self.normalized.get(fp['normalizedSha256'],set())
        indices=set(np.flatnonzero(distances<=12).tolist())|exact
        matches=[{'code':self.images[i]['code'],'distance':int(distances[i]),'exactImage':i in exact} for i in indices]
        matches.sort(key=lambda m:(not m['exactImage'],m['distance'],m['code']))
        return matches
