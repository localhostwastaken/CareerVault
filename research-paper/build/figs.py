import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
plt.rcParams["font.family"] = "serif"
plt.rcParams["font.serif"] = ["Times New Roman", "Liberation Serif", "DejaVu Serif"]
FS = 6.6
W = 3.45

def canvas(h):
    fig = plt.figure(figsize=(W, h), dpi=400)
    ax = fig.add_axes([0, 0, 1, 1]); ax.set_xlim(0, W); ax.set_ylim(0, h); ax.axis("off")
    return fig, ax

def box(ax, x, y, w, h, text, fc="white", ec="black", lw=0.7, fs=FS, rounded=True, weight="normal", ls="-"):
    st = "round,pad=0,rounding_size=0.04" if rounded else "square,pad=0"
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle=st, fc=fc, ec=ec, lw=lw, ls=ls))
    if text:
        ax.text(x + w/2, y + h/2, text, ha="center", va="center", fontsize=fs, weight=weight, linespacing=1.15)

def group(ax, x, y, w, h, title, ls="--"):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0,rounding_size=0.05", fc="none", ec="#444444", lw=0.6, ls=ls))
    ax.text(x + 0.05, y + h - 0.04, title, ha="left", va="top", fontsize=FS, style="italic")

def arrow(ax, p, q, style="-|>", ls="-", lw=0.7, rad=0.0, label=None, lpos=0.5, loff=(0, 0.05), fs=FS-0.6):
    a = FancyArrowPatch(p, q, arrowstyle=style, mutation_scale=5, lw=lw, ls=ls, color="black",
                        connectionstyle=f"arc3,rad={rad}", shrinkA=0, shrinkB=0)
    ax.add_patch(a)
    if label:
        ax.text(p[0] + (q[0]-p[0])*lpos + loff[0], p[1] + (q[1]-p[1])*lpos + loff[1], label, fontsize=fs, ha="center", va="center", style="italic",
                bbox=dict(fc="white", ec="none", pad=0.4))

G1, G2 = "#eeeeee", "#d4d4d4"



# ---------------- Fig 1: architecture ----------------
fig, ax = canvas(3.95)
group(ax, 0.03, 3.14, 3.39, 0.78, "Clients")
box(ax, 0.10, 3.20, 1.04, 0.5, "React SPA\n5 role portals,\npublic verifier", G1)
box(ax, 1.20, 3.20, 1.04, 0.5, "Offline CLI /\nbrowser proof\nchecker", G1)
box(ax, 2.30, 3.20, 1.06, 0.5, "Third-party\nverifier\n(X-API-Key)", G1)
group(ax, 0.03, 1.28, 3.39, 1.74, "NestJS API (77 REST endpoints)", ls="-")
box(ax, 0.10, 2.50, 1.04, 0.36, "Auth \u00b7 RBAC\nthrottle \u00b7 CSRF")
box(ax, 1.20, 2.50, 1.04, 0.36, "Document lifecycle\n+ bulk issuance")
box(ax, 2.30, 2.50, 1.06, 0.36, "Public verification\n(six checks)")
box(ax, 0.10, 1.38, 1.04, 0.92, "Crypto core\nJCS \u00b7 SHA-256\nRS256 signing\n\nPrisma field-\nencryption layer\n(AES-256-GCM)", G1)
box(ax, 1.20, 1.78, 1.04, 0.36, "Merkle batch worker\n(00:00 IST cron)")
box(ax, 2.30, 1.78, 1.06, 0.36, "Talent matching\n+ consent gate")
group(ax, 0.03, 0.04, 1.14, 1.12, "Persistence")
box(ax, 0.09, 0.10, 1.02, 0.72, "PostgreSQL\n+ pgvector;\nobject store\n(sealed PDFs,\nwrapped keys)", G1, fs=6.0)
group(ax, 1.23, 0.04, 2.19, 1.12, "Other services")
box(ax, 1.30, 0.10, 0.98, 0.72, "AnchorRegistry\ncontract,\nPolygon Amoy\n(chain 80002)", G2, weight="bold", fs=6.0)
box(ax, 2.36, 0.10, 0.99, 0.72, "AI service\n(FastAPI)\nextract \u00b7 embed\n\u00b7 rank", fs=6.0)
arrow(ax, (0.62, 3.20), (0.62, 2.86))
arrow(ax, (2.83, 3.20), (2.83, 2.86))
arrow(ax, (1.50, 2.50), (1.14, 2.20))
arrow(ax, (2.50, 2.50), (1.14, 2.10))
arrow(ax, (1.72, 1.78), (1.72, 0.82))
ax.text(1.72, 1.40, "anchorRoot", fontsize=FS-1, style="italic", ha="center", va="center", bbox=dict(fc="white", ec="none", pad=0.3))
arrow(ax, (2.83, 1.78), (2.83, 0.82))
ax.text(2.83, 1.40, "rank / embed", fontsize=FS-1, style="italic", ha="center", va="center", bbox=dict(fc="white", ec="none", pad=0.3))
arrow(ax, (0.62, 1.38), (0.62, 0.82))
fig.savefig("../figures/fig1_architecture.png", dpi=400)
plt.close(fig)

# ---------------- Fig 2: lifecycle ----------------
fig, ax = canvas(2.52)
bw, bh = 0.80, 0.27
def sb(x, y, t, fc="white"): box(ax, x, y, bw, bh, t, fc, fs=6.3)
Y0, Y1, Y2 = 1.95, 1.15, 0.38
sb(0.05, Y0, "REQUESTED"); sb(1.25, Y0, "DRAFT"); sb(2.55, Y0, "PENDING_HR", G1)
sb(2.55, Y1, "ISSUED", G1); sb(2.55, Y2, "ANCHORED", G2)
sb(0.05, Y2, "EXPIRED"); sb(1.25, Y2, "REVOKED", "#bbbbbb")
arrow(ax, (0.85, Y0+0.135), (1.25, Y0+0.135)); ax.text(1.05, Y0+0.19, "edit", fontsize=5.6, style="italic", ha="center")
arrow(ax, (2.05, Y0+0.19), (2.55, Y0+0.19)); ax.text(2.30, Y0+0.25, "sign", fontsize=5.6, style="italic", ha="center")
arrow(ax, (2.55, Y0+0.07), (2.05, Y0+0.07)); ax.text(2.30, Y0-0.02, "HR rejects", fontsize=5.6, style="italic", ha="center", va="top")
arrow(ax, (0.45, Y0+bh), (2.95, Y0+bh), rad=-0.16)
ax.text(1.65, 2.62, "manager signs from REQUESTED or DRAFT", fontsize=5.6, style="italic", ha="center", va="center")
arrow(ax, (2.95, Y0), (2.95, Y1+bh)); ax.text(3.0, (Y0+Y1+bh)/2, "HR co-signs", fontsize=5.6, style="italic", va="center")
arrow(ax, (2.95, Y1), (2.95, Y2+bh)); ax.text(3.0, (Y1+Y2+bh)/2, "batch", fontsize=5.6, style="italic", va="center")
arrow(ax, (2.55, Y1+0.05), (2.05, Y2+bh))
arrow(ax, (2.55, Y2+0.135), (2.05, Y2+0.135), ls="--")
ax.text(1.93, 0.90, "HR revokes", fontsize=5.6, style="italic", ha="center", va="center")
arrow(ax, (2.55, Y1+0.2), (0.85, Y2+bh))
ax.text(0.95, 1.17, "validity lapses (daily job)", fontsize=5.6, style="italic", ha="center", va="center")
box(ax, 0.05, 1.50, 1.30, 0.32, "HR bulk CSV issuance\nenters at ISSUED", "white", fs=5.6, ls="--")
arrow(ax, (1.35, 1.62), (2.55, Y1+0.24), ls="--")
fig.savefig("../figures/fig2_lifecycle.png", dpi=400)
plt.close(fig)

# ---------------- Fig 3: cryptographic pipeline ----------------
fig, ax = canvas(3.75)
def lab(y, t): ax.text(0.04, y, t, fontsize=6.0, style="italic", rotation=90, ha="center", va="center")
bx = 0.18; bw_ = 3.22
box(ax, bx, 3.28, bw_, 0.40, "credentialSubject c: validated per type, server-injected fields,\nempty values dropped (normalizeSubject)", G1)
box(ax, bx, 2.72, bw_, 0.38, "salt = 32 random bytes (64 hex chars)\ndocumentHash h = SHA-256( JCS(c) \u2016 salt )")
box(ax, bx, 2.10, 1.55, 0.42, "s_M = SHA-256(JCS{v:1, h,\nrole:MANAGER, memberId})\n\u03c3_M = RS256(sk_org, s_M)", fs=5.8)
box(ax, bx+1.67, 2.10, 1.55, 0.42, "s_H = SHA-256(JCS{v:1, h,\nrole:HR, memberId})\n\u03c3_H = RS256(sk_org, s_H)", fs=5.8)
box(ax, bx, 1.28, bw_, 0.50, "Daily batch (integrity gate first): leaves = {h\u1d62}\nroot r = Merkle(SHA-256, sorted pairs, odd node promoted)\nper-document proof path stored", G1)
box(ax, bx, 0.78, bw_, 0.28, "AnchorRegistry.anchorRoot(r, n)  \u2192  tx hash, block", G2, weight="bold")
box(ax, bx, 0.06, bw_, 0.50, "Credential file (JSON-LD): c, salt, h, \u03c3_M, \u03c3_H, issuer public key,\nproof path, anchor {chain, contract, tx}; verifiable offline", "white")
arrow(ax, (1.79, 3.28), (1.79, 3.10))
arrow(ax, (1.79, 2.72), (1.0, 2.52)); arrow(ax, (1.79, 2.72), (2.57, 2.52))
arrow(ax, (1.79, 2.10), (1.79, 1.78))
arrow(ax, (1.79, 1.28), (1.79, 1.06))
arrow(ax, (1.79, 0.78), (1.79, 0.56))
ax.plot([0.10, 0.10], [2.05, 3.70], color="#444444", lw=0.6)
ax.plot([0.10, 0.10], [0.62, 1.82], color="#444444", lw=0.6)
ax.text(0.03, 2.9, "at issuance (sign / approve)", fontsize=5.8, style="italic", rotation=90, ha="center", va="center")
ax.text(0.03, 1.2, "at batch time (\u2264 24 h later)", fontsize=5.8, style="italic", rotation=90, ha="center", va="center")
fig.savefig("../figures/fig3_pipeline.png", dpi=400)
plt.close(fig)

# ---------------- Fig 4: benchmark ----------------
import numpy as np
n = np.array([10, 100, 1000, 10000, 100000])
proof_b = np.array([128, 224, 320, 448, 544])
ver_us = np.array([11.8, 17.1, 27.7, 41.1, 44.7])
build_ms = np.array([0.06, 0.24, 3.36, 25.13, 277.93])
fig, ax1 = plt.subplots(figsize=(3.45, 2.1), dpi=400)
ax1.set_xscale("log")
l1, = ax1.plot(n, proof_b, "o-", color="black", ms=3, lw=0.9, label="Proof size (bytes)")
ax1.set_xlabel("Documents per daily batch (n)", fontsize=7); ax1.set_ylabel("Proof size (bytes)", fontsize=7)
ax1.tick_params(labelsize=6.5); ax1.set_ylim(0, 640)
ax2 = ax1.twinx()
l2, = ax2.plot(n, ver_us, "s--", color="#555555", ms=3, lw=0.9, label="Proof verification (\u00b5s)")
ax2.set_ylabel("Proof verification (\u00b5s)", fontsize=7); ax2.tick_params(labelsize=6.5); ax2.set_ylim(0, 64)
ax1.legend(handles=[l1, l2], fontsize=6.3, loc="lower right", frameon=False)
ax1.grid(True, which="major", lw=0.3, color="#cccccc")
fig.tight_layout(pad=0.3)
fig.savefig("../figures/fig4_benchmark.png", dpi=400)
plt.close(fig)
