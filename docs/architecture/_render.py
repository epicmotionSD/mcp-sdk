#!/usr/bin/env python3
"""Render Capability Mesh architecture visuals.
Design philosophy: Connective Geometry (see design-philosophy.md).
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

FONT_DIR = Path(
    "C:/Users/shawn/AppData/Roaming/Claude/local-agent-mode-sessions/"
    "skills-plugin/c4601c4a-e5bc-4568-928a-c77038b65edf/"
    "5a10ec83-d3f5-4609-a7ac-78f026c3efa8/skills/canvas-design/canvas-fonts"
)
OUT_DIR = Path("C:/Users/shawn/Projects/openconductor-mcp-sdk/docs/architecture")
OUT_DIR.mkdir(parents=True, exist_ok=True)

W, H = 2800, 1750

# Connective Geometry palette
PAPER       = (244, 239, 230)
INK         = (24, 28, 54)
INK_SOFT    = (60, 67, 99)
SLATE       = (108, 114, 128)
SLATE_SOFT  = (180, 178, 168)
EDGE        = (210, 203, 191)
AMBER       = (200, 110, 20)
AMBER_BG    = (244, 226, 192)
AMBER_DEEP  = (160, 88, 14)


def F(name, size):
    return ImageFont.truetype(str(FONT_DIR / name), size)

# Font factories
TITLE_F   = lambda s: F("InstrumentSerif-Regular.ttf", s)
SUB_F     = lambda s: F("InstrumentSans-Regular.ttf", s)
SUB_B_F   = lambda s: F("InstrumentSans-Bold.ttf", s)
LABEL_F   = lambda s: F("BricolageGrotesque-Regular.ttf", s)
LABEL_B_F = lambda s: F("BricolageGrotesque-Bold.ttf", s)
MONO_F    = lambda s: F("GeistMono-Regular.ttf", s)
MONO_B_F  = lambda s: F("GeistMono-Bold.ttf", s)


# --- primitives ---

def text(draw, xy, s, font, color=INK, anchor="lt"):
    draw.text(xy, s, font=font, fill=color, anchor=anchor)


def tracked_text(draw, xy, s, font, color=INK, tracking=2, anchor="lt"):
    """Letter-spaced text. Anchor: lt | lm | mm | rm | mt."""
    chars = list(s)
    widths = []
    for ch in chars:
        bbox = font.getbbox(ch)
        widths.append(bbox[2] - bbox[0])
    total = sum(widths) + tracking * max(0, len(chars) - 1)
    asc, desc = font.getmetrics()
    x, y = xy
    if anchor.startswith("m"):
        x -= total / 2
    elif anchor.startswith("r"):
        x -= total
    if anchor.endswith("m"):
        y -= asc / 2
    elif anchor.endswith("b"):
        y -= asc
    for ch, w in zip(chars, widths):
        draw.text((x, y), ch, font=font, fill=color, anchor="lt")
        x += w + tracking


def rbox(draw, xyxy, fill=None, outline=INK, width=2, radius=8):
    draw.rounded_rectangle(xyxy, radius=radius, fill=fill, outline=outline, width=width)


def line(draw, p1, p2, color=INK, width=2):
    draw.line([p1, p2], fill=color, width=width)


def dashed(draw, p1, p2, color=SLATE_SOFT, width=1, dash=12, gap=8):
    x1, y1 = p1
    x2, y2 = p2
    if x1 == x2:
        y, end = (y1, y2) if y2 > y1 else (y2, y1)
        while y < end:
            ye = min(y + dash, end)
            draw.line([(x1, y), (x1, ye)], fill=color, width=width)
            y = ye + gap
    else:
        x, end = (x1, x2) if x2 > x1 else (x2, x1)
        while x < end:
            xe = min(x + dash, end)
            draw.line([(x, y1), (xe, y1)], fill=color, width=width)
            x = xe + gap


def arrowhead(draw, p, direction, color=INK, size=14):
    """direction: 'r','l','u','d'"""
    x, y = p
    s = size
    if direction == "r":
        tri = [(x, y), (x - s, y - s * 0.5), (x - s, y + s * 0.5)]
    elif direction == "l":
        tri = [(x, y), (x + s, y - s * 0.5), (x + s, y + s * 0.5)]
    elif direction == "d":
        tri = [(x, y), (x - s * 0.5, y - s), (x + s * 0.5, y - s)]
    else:  # 'u'
        tri = [(x, y), (x - s * 0.5, y + s), (x + s * 0.5, y + s)]
    draw.polygon(tri, fill=color)


def harrow(draw, p1, p2, color=INK, width=2, dashed_=False, head=14):
    """Horizontal arrow."""
    if dashed_:
        dashed(draw, p1, p2, color=color, width=width)
    else:
        line(draw, p1, p2, color=color, width=width)
    arrowhead(draw, p2, "r" if p2[0] > p1[0] else "l", color=color, size=head)


def varrow(draw, p1, p2, color=INK, width=2, dashed_=False, head=14):
    if dashed_:
        dashed(draw, p1, p2, color=color, width=width)
    else:
        line(draw, p1, p2, color=color, width=width)
    arrowhead(draw, p2, "d" if p2[1] > p1[1] else "u", color=color, size=head)


def biarrow_v(draw, p1, p2, color=INK, width=2, head=14):
    """Vertical bidirectional arrow."""
    line(draw, p1, p2, color=color, width=width)
    arrowhead(draw, p2, "d" if p2[1] > p1[1] else "u", color=color, size=head)
    arrowhead(draw, p1, "u" if p2[1] > p1[1] else "d", color=color, size=head)


def elbow_arrow(draw, points, color=INK, width=2, head=14, dashed_=False):
    for i in range(len(points) - 2):
        if dashed_:
            dashed(draw, points[i], points[i + 1], color=color, width=width)
        else:
            line(draw, points[i], points[i + 1], color=color, width=width)
    p_pen = points[-2]
    p_end = points[-1]
    if dashed_:
        dashed(draw, p_pen, p_end, color=color, width=width)
    else:
        line(draw, p_pen, p_end, color=color, width=width)
    if p_end[0] > p_pen[0]:
        d = "r"
    elif p_end[0] < p_pen[0]:
        d = "l"
    elif p_end[1] > p_pen[1]:
        d = "d"
    else:
        d = "u"
    arrowhead(draw, p_end, d, color=color, size=head)


def corner_marks(draw, margin=60, length=22, color=SLATE_SOFT, width=1):
    """Tiny survey-map corner marks."""
    for cx, cy, dx, dy in [
        (margin, margin, 1, 1),
        (W - margin, margin, -1, 1),
        (margin, H - margin, 1, -1),
        (W - margin, H - margin, -1, -1),
    ]:
        line(draw, (cx, cy), (cx + dx * length, cy), color=color, width=width)
        line(draw, (cx, cy), (cx, cy + dy * length), color=color, width=width)


def header_band(draw, fig_label, subtitle):
    """Top header common to both visuals."""
    margin = 140
    line(draw, (margin, 100), (W - margin, 100), color=EDGE, width=1)
    tracked_text(draw, (margin, 78), "OPENCONDUCTOR  ·  V1.5.0  ·  RFC",
                 MONO_F(20), color=SLATE, tracking=2, anchor="lb")
    tracked_text(draw, (W - margin, 78), fig_label,
                 MONO_F(20), color=SLATE, tracking=2, anchor="rb")
    text(draw, (margin, 130), "OpenConductor Capability Mesh", TITLE_F(104),
         color=INK, anchor="lt")
    tracked_text(draw, (margin, 282), subtitle, MONO_F(28),
                 color=SLATE, tracking=2, anchor="lt")
    line(draw, (margin, 348), (W - margin, 348), color=EDGE, width=1)


def footer_band(draw, tagline):
    margin = 140
    line(draw, (margin, H - 160), (W - margin, H - 160), color=EDGE, width=1)
    text(draw, (margin, H - 130), tagline, TITLE_F(56), color=INK, anchor="lt")
    tracked_text(draw, (W - margin, H - 88), "SONNIER VENTURES  ·  CONNECTIVE GEOMETRY",
                 MONO_F(18), color=SLATE, tracking=3, anchor="rt")


# ============================================================
# VISUAL 1 — OVERVIEW
# ============================================================

def render_overview():
    img = Image.new("RGB", (W, H), PAPER)
    draw = ImageDraw.Draw(img)

    corner_marks(draw)
    header_band(draw, "FIG. 01  ·  OVERVIEW",
                "A capability-over-identity mesh — products request results, not servers.")

    # ---------- Register A: Products ----------
    reg_label_y = 380
    tracked_text(draw, (140, reg_label_y), "A", MONO_B_F(22), color=AMBER,
                 tracking=2, anchor="lt")
    tracked_text(draw, (180, reg_label_y), "SONNIER VENTURES  ·  PRODUCTS",
                 MONO_F(22), color=SLATE, tracking=3, anchor="lt")

    cards = [
        ("x3o.ai", "INFRA-AGNOSTIC AI OPS"),
        ("GodotForge", "CI/CD  ·  PRE-FLIGHT QA"),
        ("Sound Games", "PILOT TENANT"),
    ]
    card_y = 432
    card_h = 184
    card_w = 560
    card_x = [120, 1120, 2120]  # centers: 400, 1400, 2400
    for (name, sub), x in zip(cards, card_x):
        rbox(draw, (x, card_y, x + card_w, card_y + card_h),
             fill=PAPER, outline=INK, width=2, radius=10)
        text(draw, (x + 36, card_y + 50), name, LABEL_B_F(56), color=INK, anchor="lt")
        tracked_text(draw, (x + 36, card_y + 130), sub, MONO_F(18),
                     color=SLATE, tracking=3, anchor="lt")

    # Trunk + drop into mesh (Resolver API)
    # Trunk y = 660, drop x = 400 (Resolver API top-center)
    trunk_y = 660
    # vertical drops from each card bottom-center
    for cx in [400, 1400, 2400]:
        line(draw, (cx, card_y + card_h), (cx, trunk_y), color=INK, width=2)
        # tiny terminal disc on card edge
        draw.ellipse((cx - 5, card_y + card_h - 5, cx + 5, card_y + card_h + 5), fill=INK)
    # trunk
    line(draw, (400, trunk_y), (2400, trunk_y), color=INK, width=2)
    # collector node at trunk left = where drop into mesh begins
    # main drop into Resolver API
    varrow(draw, (400, trunk_y), (400, 800), color=INK, width=2, head=16)

    # ---------- Register B: Capability Mesh ----------
    mesh_l, mesh_t, mesh_r, mesh_b = 110, 720, 2690, 1180
    rbox(draw, (mesh_l, mesh_t, mesh_r, mesh_b), fill=None, outline=EDGE,
         width=1, radius=14)

    tracked_text(draw, (mesh_l + 24, mesh_t + 22), "B",
                 MONO_B_F(22), color=AMBER, tracking=2, anchor="lt")
    tracked_text(draw, (mesh_l + 64, mesh_t + 22),
                 "OPENCONDUCTOR  ·  CAPABILITY MESH",
                 MONO_F(22), color=SLATE, tracking=3, anchor="lt")
    # tiny inner caption
    tracked_text(draw, (mesh_r - 24, mesh_t + 22),
                 "STATEFUL  ·  PER-TENANT  ·  POLICY-AWARE",
                 MONO_F(18), color=SLATE, tracking=3, anchor="rt")

    # Module geometry
    res_x, res_y, res_w, res_h = 180, 800, 440, 150          # Resolver API
    auth_x, auth_y, auth_w, auth_h = 180, 990, 440, 150       # Auth Proxy
    bro_x, bro_y, bro_w, bro_h = 700, 790, 540, 350           # Broker
    reg_x, reg_y, reg_w, reg_h = 1320, 800, 920, 150          # Registry
    tel_x, tel_y, tel_w, tel_h = 1320, 990, 920, 150          # Telemetry/Billing Hook
    bill_x, bill_y, bill_w, bill_h = 2300, 990, 320, 150      # Billing Engine

    def module(xyxy, name, sub, *, accent=False, dashed_=False):
        x0, y0, x1, y1 = xyxy
        if dashed_:
            # draw dashed outline manually
            for px in range(x0, x1, 14):
                draw.line([(px, y0), (min(px + 8, x1), y0)], fill=AMBER, width=2)
                draw.line([(px, y1), (min(px + 8, x1), y1)], fill=AMBER, width=2)
            for py in range(y0, y1, 14):
                draw.line([(x0, py), (x0, min(py + 8, y1))], fill=AMBER, width=2)
                draw.line([(x1, py), (x1, min(py + 8, y1))], fill=AMBER, width=2)
        else:
            rbox(draw, xyxy, fill=PAPER, outline=AMBER if accent else INK,
                 width=2, radius=10)
        # Name
        text_color = AMBER_DEEP if (accent or dashed_) else INK
        text(draw, (x0 + 26, y0 + 30), name, LABEL_B_F(36),
             color=text_color, anchor="lt")
        if sub:
            tracked_text(draw, (x0 + 26, y0 + 92), sub, MONO_F(18),
                         color=SLATE, tracking=3, anchor="lt")

    module((res_x, res_y, res_x + res_w, res_y + res_h),
           "Resolver API", "RESOLVE(REQ)  ·  DRY-RUN  ·  LIST")
    module((auth_x, auth_y, auth_x + auth_w, auth_y + auth_h),
           "Auth Proxy", "VAULT HYDRATION  ·  KEY INJECTION")
    # Broker — hero rendering (taller box, centered hierarchy)
    rbox(draw, (bro_x, bro_y, bro_x + bro_w, bro_y + bro_h),
         fill=PAPER, outline=INK, width=2, radius=10)
    tracked_text(draw, (bro_x + 26, bro_y + 28), "CORE",
                 MONO_F(18), color=SLATE, tracking=4, anchor="lt")
    # Top-right amber accent dot — single point of color (Connective Geometry: one accent)
    dot_cx, dot_cy = bro_x + bro_w - 32, bro_y + 38
    draw.ellipse((dot_cx - 6, dot_cy - 6, dot_cx + 6, dot_cy + 6), fill=AMBER)
    # Centered "Stateful / Broker" type stack
    bro_cx = bro_x + bro_w / 2
    bro_cy = bro_y + bro_h / 2
    text(draw, (bro_cx, bro_cy - 56), "Stateful",
         LABEL_F(48), color=INK_SOFT, anchor="mm")
    text(draw, (bro_cx, bro_cy + 12), "Broker",
         LABEL_B_F(88), color=INK, anchor="mm")
    # Bottom callouts
    tracked_text(draw, (bro_cx, bro_y + bro_h - 68),
                 "ROUTE  ·  HYDRATE  ·  ENFORCE",
                 MONO_F(20), color=SLATE, tracking=4, anchor="mm")
    tracked_text(draw, (bro_cx, bro_y + bro_h - 38),
                 "TENANT-CACHED  ·  TTL",
                 MONO_F(16), color=SLATE_SOFT, tracking=4, anchor="mm")

    module((reg_x, reg_y, reg_x + reg_w, reg_y + reg_h),
           "Capability Registry", "SEMANTIC INDEX  ·  RANK  ·  FILTER")
    module((tel_x, tel_y, tel_x + tel_w, tel_y + tel_h),
           "Telemetry / Billing Hook", "REQUIREPAYMENT()  ·  USAGE EVENT")
    # Billing Engine — dashed amber, "downstream"
    module((bill_x, bill_y, bill_x + bill_w, bill_y + bill_h),
           "Billing", "DOWNSTREAM", accent=True, dashed_=True)

    # Connections
    # Resolver → Broker  (right)
    harrow(draw, (res_x + res_w + 4, res_y + res_h / 2),
           (bro_x - 4, res_y + res_h / 2), color=INK, width=2, head=14)
    # Auth Proxy ← Broker  (left arrow head pointing to Auth Proxy)
    harrow(draw, (bro_x - 4, auth_y + auth_h / 2),
           (auth_x + auth_w + 4, auth_y + auth_h / 2), color=INK, width=2, head=14)
    # Wait: brief says Broker connects TO Auth Proxy. Direction: Broker → Auth Proxy.
    # So arrow head on Auth Proxy (left side of the arrow).
    # The harrow above goes from p1=Broker_left (700) to p2=Auth_right (620+440=620).
    # p2.x < p1.x so direction "l", arrowhead points left at p2 — at Auth Proxy right edge. ✓

    # Broker → Registry  (right)
    harrow(draw, (bro_x + bro_w + 4, reg_y + reg_h / 2),
           (reg_x - 4, reg_y + reg_h / 2), color=INK, width=2, head=14)
    # Broker → Telemetry  (right)
    harrow(draw, (bro_x + bro_w + 4, tel_y + tel_h / 2),
           (tel_x - 4, tel_y + tel_h / 2), color=INK, width=2, head=14)
    # Telemetry → Billing Engine (dashed amber, right)
    harrow(draw, (tel_x + tel_w + 4, tel_y + tel_h / 2),
           (bill_x - 4, tel_y + tel_h / 2),
           color=AMBER, width=2, dashed_=True, head=14)

    # ---------- Register C: Vault + MCP Pool ----------
    reg_c_label_y = 1220
    tracked_text(draw, (140, reg_c_label_y), "C", MONO_B_F(22), color=AMBER,
                 tracking=2, anchor="lt")
    tracked_text(draw, (180, reg_c_label_y),
                 "TENANT VAULT  /  MCP SERVER POOL",
                 MONO_F(22), color=SLATE, tracking=3, anchor="lt")

    vault_x, vault_y, vault_w, vault_h = 120, 1268, 560, 260
    pool_x, pool_y, pool_w, pool_h = 760, 1268, 1920, 260

    rbox(draw, (vault_x, vault_y, vault_x + vault_w, vault_y + vault_h),
         fill=PAPER, outline=INK, width=2, radius=10)
    text(draw, (vault_x + 30, vault_y + 36), "Tenant Vault",
         LABEL_B_F(40), color=INK, anchor="lt")
    tracked_text(draw, (vault_x + 30, vault_y + 100),
                 "SUPABASE", MONO_F(20), color=SLATE, tracking=4, anchor="lt")
    # Vault inner detail: two rows
    inner_y = vault_y + 158
    line(draw, (vault_x + 30, inner_y), (vault_x + vault_w - 30, inner_y),
         color=EDGE, width=1)
    text(draw, (vault_x + 30, inner_y + 14), "› per-tenant credentials",
         MONO_F(20), color=INK_SOFT, anchor="lt")
    text(draw, (vault_x + 30, inner_y + 50), "› policy + budget caps",
         MONO_F(20), color=INK_SOFT, anchor="lt")

    rbox(draw, (pool_x, pool_y, pool_x + pool_w, pool_y + pool_h),
         fill=PAPER, outline=INK, width=2, radius=10)
    text(draw, (pool_x + 30, pool_y + 28), "MCP Server Pool",
         LABEL_B_F(34), color=INK, anchor="lt")
    tracked_text(draw, (pool_x + 30, pool_y + 78),
                 "DISCOVERED  ·  HYDRATED  ·  POLICED",
                 MONO_F(18), color=SLATE, tracking=3, anchor="lt")

    # Server tokens inside pool
    servers = ["supabase-mcp", "gdscript-lint-mcp", "asset-optimizer-mcp", "…"]
    tok_y, tok_h = pool_y + 130, 100
    tok_w = 420
    # 4 tokens, gap 80
    base_x = pool_x + 30
    inner_w = pool_w - 60
    gap = (inner_w - 4 * tok_w) // 3  # ~80
    for i, name in enumerate(servers):
        tx = base_x + i * (tok_w + gap)
        rbox(draw, (tx, tok_y, tx + tok_w, tok_y + tok_h),
             fill=PAPER, outline=INK_SOFT, width=1, radius=8)
        # Mono name
        if name == "…":
            text(draw, (tx + tok_w / 2, tok_y + tok_h / 2), "…",
                 LABEL_B_F(48), color=SLATE, anchor="mm")
        else:
            text(draw, (tx + tok_w / 2, tok_y + tok_h / 2 - 8), name,
                 MONO_F(24), color=INK, anchor="mm")
            tracked_text(draw, (tx + tok_w / 2, tok_y + tok_h / 2 + 22),
                         "MCP", MONO_F(14), color=SLATE, tracking=4, anchor="mt")

    # Auth Proxy ↔ Vault (vertical bidirectional)
    biarrow_v(draw, (auth_x + auth_w / 2, auth_y + auth_h + 4),
              (vault_x + vault_w / 2, vault_y - 4), color=INK, width=2, head=14)
    # Hmm — auth_x + auth_w/2 = 400, vault_x + vault_w/2 = 120 + 280 = 400. Aligned. ✓

    # Broker → MCP Pool (down + trunk + stubs)
    bro_bottom_x = bro_x + bro_w / 2  # 970
    bro_bottom_y = bro_y + bro_h
    # Drop from Broker to trunk
    line(draw, (bro_bottom_x, bro_bottom_y + 4),
         (bro_bottom_x, pool_y - 38), color=INK, width=2)
    # Trunk over the pool
    token_centers = [pool_x + 30 + i * (tok_w + gap) + tok_w / 2 for i in range(4)]
    trunk_left = min(bro_bottom_x, token_centers[0])
    trunk_right = max(bro_bottom_x, token_centers[-1])
    line(draw, (trunk_left, pool_y - 38), (trunk_right, pool_y - 38),
         color=INK, width=2)
    # Stubs to each token top
    for cx in token_centers:
        varrow(draw, (cx, pool_y - 38), (cx, tok_y - 4),
               color=INK, width=2, head=14)

    footer_band(draw, "Consumers request a result, not a server.")

    img.save(OUT_DIR / "capability-mesh-overview.png", "PNG", optimize=True)
    print("wrote", OUT_DIR / "capability-mesh-overview.png")


# ============================================================
# VISUAL 2 — RESOLUTION FLOW (sequence)
# ============================================================

def render_sequence():
    img = Image.new("RGB", (W, H), PAPER)
    draw = ImageDraw.Draw(img)

    corner_marks(draw)
    header_band(draw, "FIG. 02  ·  RESOLUTION FLOW",
                "Sequence — resolve(CapabilityRequest) → result, with policy and budget alt-paths.")

    # ---------- Actors ----------
    actors = [
        ("x3o.ai", "TENANT T1"),
        ("Resolver API", "ENTRY"),
        ("Broker", "STATEFUL"),
        ("Registry", "SEMANTIC"),
        ("Vault", "SUPABASE"),
        ("MCP Server", "HYDRATED"),
        ("Telemetry", "BILLING"),
    ]
    n = len(actors)
    margin = 200
    actor_xs = [int(margin + (W - 2 * margin) * i / (n - 1)) for i in range(n)]

    actor_y_top = 410
    actor_h = 110
    actor_w = 220
    for (name, sub), x in zip(actors, actor_xs):
        rbox(draw, (x - actor_w / 2, actor_y_top,
                    x + actor_w / 2, actor_y_top + actor_h),
             fill=PAPER, outline=INK, width=2, radius=10)
        text(draw, (x, actor_y_top + 38), name, LABEL_B_F(28),
             color=INK, anchor="mm")
        tracked_text(draw, (x, actor_y_top + 78), sub, MONO_F(15),
                     color=SLATE, tracking=3, anchor="mm")

    lifeline_top = actor_y_top + actor_h + 16
    lifeline_bot = 1490
    for x in actor_xs:
        dashed(draw, (x, lifeline_top), (x, lifeline_bot),
               color=SLATE_SOFT, width=1, dash=10, gap=8)

    # ---------- Step helper ----------
    def step(num, i, j, label, y, dashed_=False, color=INK, sub=None):
        x1, x2 = actor_xs[i], actor_xs[j]
        edge = actor_w / 2 + 8
        if x2 > x1:
            xs, xe = x1 + edge - actor_w / 2, x2 - edge + actor_w / 2
            # Simpler: from lifeline x1 to lifeline x2, with small padding
            xs, xe = x1, x2
        else:
            xs, xe = x1, x2
        # Actually: arrows go from lifeline to lifeline directly
        if dashed_:
            dashed(draw, (xs, y), (xe, y), color=color, width=2, dash=14, gap=8)
        else:
            line(draw, (xs, y), (xe, y), color=color, width=2)
        arrowhead(draw, (xe, y), "r" if xe > xs else "l", color=color, size=14)

        # Step number — small disc on origin side
        disc_r = 18
        dx = xs + (8 if xe > xs else -8)
        # Number badge
        draw.ellipse((dx - disc_r, y - disc_r, dx + disc_r, y + disc_r),
                     fill=color, outline=color)
        num_str = str(num)
        text(draw, (dx, y - 2), num_str, MONO_B_F(20),
             color=PAPER, anchor="mm")

        # Label centered above
        midx = (xs + xe) // 2
        text(draw, (midx, y - 18), label, MONO_F(20), color=color, anchor="mb")
        if sub:
            text(draw, (midx, y + 14), sub, MONO_F(16), color=SLATE, anchor="mt")

    # ---------- Steps ----------
    y0 = 580
    dy = 78
    step(1, 0, 1, "resolve({ capability:'database:write', auth:'T1', budget:0.05 })", y0)
    step(2, 1, 2, "forward request",                                       y0 + dy)
    step(3, 2, 3, "semantic match  (capability + tags)",                   y0 + dy * 2)
    step(4, 3, 2, "ranked candidates  [S_a, S_b, …]",                      y0 + dy * 3, dashed_=True)
    step(5, 2, 4, "fetch creds + policy  for T1",                          y0 + dy * 4)
    step(6, 4, 2, "{ keys, budget_remaining, allowlist }",                 y0 + dy * 5, dashed_=True)

    # ---------- ALT branch (failure paths) ----------
    branch_y0 = y0 + dy * 5 + 38   # ~970
    branch_y1 = branch_y0 + 130
    # Subtle amber band background
    draw.rectangle((150, branch_y0, W - 150, branch_y1), fill=AMBER_BG)
    # Re-stroke lifelines through the band
    for x in actor_xs:
        dashed(draw, (x, branch_y0), (x, branch_y1),
               color=SLATE_SOFT, width=1, dash=10, gap=8)
    # Frame
    draw.rectangle((150, branch_y0, W - 150, branch_y1),
                   outline=AMBER, width=2)
    # Corner label tab
    tab_w = 220
    draw.rectangle((150, branch_y0, 150 + tab_w, branch_y0 + 32),
                   fill=AMBER, outline=AMBER)
    tracked_text(draw, (150 + tab_w / 2, branch_y0 + 16), "ALT  ·  FAIL",
                 MONO_B_F(16), color=PAPER, tracking=4, anchor="mm")

    # Failure return arrows — both Broker → x3o.ai
    fail1_y = branch_y0 + 60
    fail2_y = branch_y0 + 100
    step("6a", 2, 0, "402  ·  PaymentRequired / BudgetExceeded",
         fail1_y, dashed_=True, color=AMBER_DEEP)
    step("6b", 2, 0, "403  ·  PolicyDenied / TenantNotProvisioned",
         fail2_y, dashed_=True, color=AMBER_DEEP)

    # ---------- ELSE / proceed marker ----------
    else_y = branch_y1 + 36
    tracked_text(draw, (160, else_y - 4), "ELSE  ·  PROCEED",
                 MONO_B_F(16), color=SLATE, tracking=4, anchor="lt")
    # subtle baseline rule below the label
    line(draw, (300, else_y + 4), (W - 150, else_y + 4), color=EDGE, width=1)

    # ---------- Happy path resumes ----------
    y1 = else_y + 50
    step(7, 2, 5, "invoke(tool, args, hydratedAuth)",       y1)
    step(8, 5, 2, "result",                                  y1 + dy, dashed_=True)
    step(9, 2, 6, "emit usage event  (tenant, capability, cost)", y1 + dy * 2)
    step(10, 2, 0, "{ result, resolutionId, costApplied }", y1 + dy * 3, dashed_=True)

    # ---------- Footnote ----------
    note_y = lifeline_bot + 30
    line(draw, (140, note_y), (W - 140, note_y), color=EDGE, width=1)
    tracked_text(draw, (140, note_y + 22), "NOTE",
                 MONO_B_F(20), color=AMBER, tracking=3, anchor="lt")
    text(draw, (240, note_y + 22),
         "On invocation failure, Broker retries the next-best candidate before surfacing the error.",
         MONO_F(20), color=INK, anchor="lt")

    footer_band(draw, "One result. One hydrated path. One billable event.")

    img.save(OUT_DIR / "capability-mesh-resolution-flow.png", "PNG", optimize=True)
    print("wrote", OUT_DIR / "capability-mesh-resolution-flow.png")


if __name__ == "__main__":
    render_overview()
    render_sequence()
