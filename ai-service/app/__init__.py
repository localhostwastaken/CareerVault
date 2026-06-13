import os

# torch (via sentence-transformers) and LightGBM each ship an OpenMP runtime; loading
# both in one process segfaults on macOS. Allow the duplicate and keep threading tame.
# Must run before any ML import, so it lives at the top of the package init.
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
