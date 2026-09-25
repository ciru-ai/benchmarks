#!/usr/bin/env python3
"""GopherMatch — a dating site for gophers, served over the Gopher protocol.

Single file, stdlib only.

    python3 gopherdating.py --port 7070

Open gopher://localhost:7070/ in any gopher client (linx, gopherus,
VNC Gopher) or raw:  printf '\\r\\n' | nc localhost 7070
"""

import argparse
import datetime
import hashlib
import re
import socketserver
import threading
import html as html_mod
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, urlparse

DEFAULT_PORT = 7070  # use --port 70 (as root) for the classic gopher port

HABITATS = ("urban", "countryside", "cloud")
VIBES = ("chill", "chaotic", "brainy")

HABITAT_LABEL = {
    "urban": "urban burrow — brick, AC, excellent WiFi",
    "countryside": "countryside — dirt, stars, slow WiFi",
    "cloud": "data center / cloud — rack 7, warm, humming",
}
VIBE_LABEL = {
    "chill": "chill — quiet, deep, sustainable",
    "chaotic": "chaotic — fast, loud, occasionally on fire",
    "brainy": "brainy — books, schematics, long talks",
}

HOSTPORT = "localhost:7070"  # set in main()


class Profile:
    def __init__(self, pid, name, age, burrow, bio, interests, vibe, habitat,
                 love, deal, winkback):
        self.id = pid
        self.name = name
        self.age = age
        self.burrow = burrow
        self.bio = bio
        self.interests = interests
        self.vibe = vibe
        self.habitat = habitat
        self.love = love
        self.deal = deal
        self.winkback = winkback

    @property
    def first(self):
        return self.name.split()[0]

    @property
    def haystack(self):
        return (self.name + " " + self.burrow + " " + self.bio + " "
                + " ".join(self.interests)).lower()


PROFILES = [
    Profile(1, "Cavey Mole", 29, "/dev/null (urban)",
            "Eaten 4,000 carrots and counting. I write love letters to /etc/motd "
            "so nobody can miss them. My burrow has a skylight that frames the "
            "moon perfectly. It's not for show. It IS for show.",
            ["digging", "sourdough", "bad puns", "cello"], "chill", "urban",
            "acts of digging", "people who talk in the burrow", True),

    Profile(2, "Digs McTunnel", 34, "downtown, 4th sub-level (urban)",
            "Software engineer by day, karaoke machine by night. My burrow has "
            "great acoustics and a tiny bar. I cannot commit — to one TV show, "
            "at least. Looking for someone to hit high notes with.",
            ["karaoke", "linux", "bouldering", "wine"], "chaotic", "urban",
            "grand slightly-drunken gestures", "people who skip the chorus", False),

    Profile(3, "Burrow", 27, "outskirts garden (countryside)",
            "Quiet type. I garden, I read, I leave the light on. My garden has "
            "forty varieties of carrot and one tomato that judges me. I have "
            "never once been late to anything.",
            ["gardening", "reading", "knitting", "stargazing"], "chill",
            "countryside", "small steady lights left on",
            "dead plants kept on display", True),

    Profile(4, "Nibbles", 25, "data center, row 7, rack 12 (cloud)",
            "I work in server room 7. It is warm, hums, and is surprisingly "
            "cozy. Looking for someone who understands the romance of uptime "
            "and the pain of a dropped packet. My desk plant is named 802.11.",
            ["servers", "synthwave", "chess", "ramen"], "brainy", "cloud",
            "shared terminals, split keyboards",
            "'it works on my machine'", False),

    Profile(5, "Gophy \"Tunnel Vision\" Dee", 31, "old quarry, city edge (countryside)",
            "My nickname is a promise. Ten years, one long-term burrow, zero "
            "dropped calls. I pack lunch. I text when I'm two minutes late. "
            "My hobby is being easy, and it's working.",
            ["hiking", "cooking", "photography", "dog parks"], "chill",
            "countryside", "showing up, on time, with snacks",
            "ghosting. obviously. also ketchup on eggs", True),

    Profile(6, "Sandy", 26, "beach burrow, 40 feet from the tide line (countryside)",
            "My cardio is swimming to my own front door. I play guitar badly "
            "and bonfires well. Looking for someone to watch the moon over the "
            "water with who won't make it weird.",
            ["swimming", "bonfires", "guitar", "sunsets"], "chaotic",
            "countryside", "bonfires, salt, shared towels",
            "people who bring a clock to the beach", True),

    Profile(7, "Whiskers \"The Mole\"", 38, "under the public library (urban)",
            "Yes, a mole, in a gopher world. Bookish, slightly dusty, great at "
            "keeping secrets. I have read your profile. Twice. There is a "
            "quiet reading room above my burrow and I have a key. We could be "
            "the quiet ones.",
            ["books", "poetry", "wine", "astronomy"], "brainy", "urban",
            "long silences, shared pages",
            "people who chew while holding open the book", True),

    Profile(8, "Bolt \"Dirtbike\"", 30, "gravel road, mile 3 (countryside)",
            "I ride a dirtbike built out of a broken bicycle. Fast, loud, "
            "occasionally on fire. My burrow overlooks three counties and I "
            "can see the rain coming from here. I make pancakes people drive "
            "forty miles for.",
            ["dirtbikes", "pancakes", "metal music", "map reading"], "chaotic",
            "countryside", "pancakes, first one at the table",
            "'is this safe?' more than three times", False),

    Profile(9, "Muddy", 33, "riverbank, the good side (countryside)",
            "Riverbank gopher. My burrow floods twice a year and I have made "
            "peace with it. I can fish, I can tell bad jokes, I own a canoe "
            "that is 90% attitude. Looking for someone with a dry bag and a "
            "good laugh.",
            ["fishing", "stand-up comedy", "hot springs", "canoeing"],
            "chaotic", "countryside", "bad jokes only we get",
            "people who get angry at the river", False),

    Profile(10, "Clover", 28, "the clover field, the good one (countryside)",
            "I forage. I can identify 200 plants, 3 mushrooms, and exactly one "
            "person I like (probably you). I preserve everything in honey, "
            "which I mean both literally and emotionally.",
            ["foraging", "honey", "jam", "birdwatching"], "chill",
            "countryside", "jars, labeled, on the windowsill",
            "'a little dirt is no big deal'", True),

    Profile(11, "Pixel", 24, "cloud storage, bucket 3 (cloud)",
            "I'm a gopher who left the ground. My burrow is a bucket in cloud "
            "storage; I render sunsets from satellite feeds and my heart rate "
            "is a metric. You have to visit me, I'm not physical (yet). Slow "
            "mornings, long talks, ambient playlists.",
            ["cloud computing", "pixel art", "rain sounds", "podcasts"],
            "chill", "cloud", "ambient playlists, shared cursors",
            "'analog is better' (it isn't)", False),

    Profile(12, "Gopher", 35, "the big hole, city park (urban)",
            "No last name. Gopher. I found this hole ten years ago and I keep "
            "it maintained like a monument. I organize the annual Burrow "
            "Festival: 400 gophers, 3 stages, one very serious carrot contest. "
            "You will love the festival. Everyone does.",
            ["festivals", "tea", "history", "organizing"], "chill", "urban",
            "tea, always two cups", "people who skip the festival", True),
]

ALL_INTERESTS = sorted({i for p in PROFILES for i in p.interests})

WINKS = {}
WINKS_LOCK = threading.Lock()


def profile_by_id(n):
    try:
        n = int(str(n).strip())
    except ValueError:
        return None
    for p in PROFILES:
        if p.id == n:
            return p
    return None


def send_wink(pid):
    with WINKS_LOCK:
        WINKS[pid] = WINKS.get(pid, 0) + 1
        return WINKS[pid]


def link(ltype, title, selector):
    return f"{ltype}\t{title}\t{selector}\t{HOSTPORT}"


def score(p, habit, vibe):
    return (3 if p.habitat == habit else 0) + (3 if p.vibe == vibe else 0)


def best_match(habit, vibe):
    def key(p):
        return (-score(p, habit, vibe),
                int(hashlib.sha256(f"{habit}|{vibe}|{p.id}".encode()).hexdigest(), 16))
    return min(PROFILES, key=key)


def page_home():
    lines = [
        "            __",
        "         o  ' _''-_",
        "         |        _|",
        "         '  |  |  |",
        "          \\  \\  \\ |",
        "           '  '  '",
        "             ( \u2665 )",
        "",
        "    ~  G O P H E R   M A T C H  ~",
        "    The burrow's original dating service.",
        "    Text-only. Mole-free.*   (*unverifiable)",
        "",
        "    What brings you by today?",
        "",
        link("t", "Browse the singles (12 gophers, mostly verified)", "/browse"),
        link("t", "Take the 10-second compatibility quiz", "/match"),
        link("1", "Today's match of the day", "/match/today"),
        link("1", "My wink ledger", "/winks"),
        link("t", "Browse singles by interest", "/interests"),
        link("1", "About this site", "/about"),
    ]
    return "\r\n".join(lines)


def page_browse():
    lines = [
        "  THE SINGLES  —  everyone currently digging",
        "  " + "-" * 46,
        "",
    ]
    for p in PROFILES:
        lines.append(link("t",
                          f"{p.name}, {p.age} — {p.habitat}, {p.vibe}",
                          f"/p/{p.id}"))
    lines += ["", link("1", "Back home", "/")]
    return "\r\n".join(lines)


def page_profile(p):
    if not p:
        return page_not_found("?")
    lines = [
        f"  {p.name.upper()}, {p.age}",
        f"  Burrow: {p.burrow}",
        f"  Vibe: {p.vibe}   |   Love language: {p.love}",
        "  " + "=" * 46,
        "",
        p.bio,
        "",
        f"  INTERESTS:  {', '.join(p.interests)}",
        f"  DEALBREAKER:  {p.deal}",
        "",
        "  ---",
        link("1", f"Wink at {p.first}", f"/wink/{p.id}"),
        link("t", "Browse more singles", "/browse"),
        link("t", "Take the compatibility quiz", "/match"),
    ]
    return "\r\n".join(lines)


def page_quiz():
    lines = [
        "  COMPATIBILITY QUIZ",
        "  Pick the line that sounds like your life. One click, no account,",
        "  no algorithmic shame.",
        "",
    ]
    for h in HABITATS:
        for v in VIBES:
            lines.append(link("t", f"{h.capitalize()} burrow + {v}",
                              f"/match/{h}/{v}"))
    lines += ["", link("1", "Back home", "/")]
    return "\r\n".join(lines)


def page_match_result(habit, vibe):
    p = best_match(habit, vibe)
    reasons = []
    if p.habitat == habit:
        reasons.append(f"same habitat: {habit}")
    else:
        reasons.append(f"{p.first} digs in a {p.habitat} spot; you said {habit} "
                       "— distance is a thing, so is adventure")
    if p.vibe == vibe:
        reasons.append(f"same vibe: {vibe}")
    else:
        reasons.append(f"{p.vibe} when you're {vibe} — complementary or "
                       "chaotic, both fine")
    lines = [
        "  YOUR MATCH",
        "  " + "=" * 34,
        "",
        f"  {p.name}, {p.age}",
        f"  Burrow: {p.burrow}",
        "",
        "  Why it works:",
        *[f"    + {r}" for r in reasons],
        f"    + {p.first}'s favorite: {p.interests[0]}",
        "",
        link("1", f"Read {p.first}'s full profile", f"/p/{p.id}"),
        link("1", f"Wink at {p.first}", f"/wink/{p.id}"),
        link("t", "Retake the quiz", "/match"),
        link("1", "Today's match", "/match/today"),
    ]
    return "\r\n".join(lines)


def page_wink(p):
    if not p:
        return page_not_found("?")
    count = send_wink(p.id)
    if p.winkback:
        msg = (f">>> {p.first} winked back!! The holes are glowing.")
    else:
        msg = (f">>> Your wink has been delivered to {p.first}'s burrow inbox.\n"
               f">>> {p.first} is digging. No response yet. "
               f"(Most gophers respond within 3-5 digs.)")
    lines = [
        f"  You winked at {p.name}.",
        "",
        msg,
        "",
        link("1", "View my winks", "/winks"),
        link("t", "Browse singles", "/browse"),
    ]
    return "\r\n".join(lines)


def page_my_winks():
    with WINKS_LOCK:
        items = sorted(WINKS.items())
    lines = ["  MY WINK LEDGER", "  " + "=" * 34, ""]
    if not items:
        lines.append("  Empty. A little sad. Fix that?")
    for pid, n in items:
        p = profile_by_id(pid)
        status = "WINKED BACK" if p.winkback else f"pending ({n}x)"
        lines.append(f"  {p.name} — {status}")
    lines += ["", link("t", "Browse singles", "/browse")]
    return "\r\n".join(lines)


def page_match_today():
    d = datetime.date.today()
    idx = int(hashlib.sha256(d.isoformat().encode()).hexdigest(), 16) % len(PROFILES)
    p = PROFILES[idx]
    bio = p.bio if len(p.bio) <= 180 else p.bio[:177] + "..."
    lines = [
        "  TODAY'S MATCH",
        "  " + "=" * 34,
        "",
        f"  {d.strftime('%A, %B %d, %Y')}",
        "",
        f"  {p.name}, {p.age}",
        f"  Burrow: {p.burrow}",
        "",
        bio,
        "",
        link("1", f"Read {p.first}'s full profile", f"/p/{p.id}"),
        link("t", "Browse singles", "/browse"),
    ]
    return "\r\n".join(lines)


def page_interests():
    lines = [
        "  BROWSE BY INTEREST",
        "  " + "-" * 30,
        "",
        *[link("1", t, f"/s/{t}") for t in ALL_INTERESTS],
        "",
        link("1", "Back home", "/"),
    ]
    return "\r\n".join(lines)


def page_search(term):
    lines = []
    if not term:
        lines += [
            "  SEARCH",
            "  No term given. Type one in your gopher client, e.g.:",
            f"    gopher://{HOSTPORT}/s/digging",
            "",
            "  Or pick an interest:",
            "",
            *[link("1", t, f"/s/{t}") for t in ALL_INTERESTS],
        ]
        return "\r\n".join(lines)
    term_l = term.lower()
    hits = [p for p in PROFILES if term_l in p.haystack]
    lines = [
        f"  SEARCH: {term}",
        "  " + "-" * 34,
        "",
    ]
    if not hits:
        lines.append(f"  No gophers matched {term!r}. Try 'digging', 'wine', "
                     "or 'pancakes'.")
    for p in hits:
        lines.append(link("3", f"{p.name}, {p.age} — {p.vibe}", f"/p/{p.id}"))
    lines += ["", link("1", "Back to interests", "/interests")]
    return "\r\n".join(lines)


def page_about():
    lines = [
        "  ABOUT GopherMatch",
        "  " + "=" * 34,
        "",
        "  GopherMatch is a dating site for gophers, served over the Gopher",
        "  protocol — the internet's original hypertext system. Older than",
        "  the web, still running, 100% text.",
        "",
        "  Gopher was invented in 1991 by Steve Nebes and Mark McCracken at",
        "  the University of Minnesota. This whole site is one Python file.",
        "  There is no database, no account, no feed, and no algorithm that",
        "  knows you better than your burrow does.",
        "",
        "  All gophers are fictional. Any resemblance to actual gophers,",
        "  living or buried, is a compliment.",
        "",
        f"  Connect:  gopher://{HOSTPORT}/",
        f"  Try:      linx gopher://localhost:{HOSTPORT.split(':')[1]}/",
        "",
        link("1", "Back home", "/"),
    ]
    return "\r\n".join(lines)


def page_not_found(sel):
    lines = [
        "  404: no such burrow",
        "  The hole you asked for does not exist, or it's private.",
        "",
        f"  (you asked for: {sel or '<empty>'})",
        "",
        link("1", "Back home", "/"),
    ]
    return "\r\n".join(lines)


def route(selector, search):
    sel = selector.strip()
    if sel in ("", "/"):
        return page_home()
    if sel == "/browse":
        return page_browse()
    if sel.startswith("/p/"):
        return page_profile(profile_by_id(sel[3:]))
    if sel.startswith("/wink/"):
        return page_wink(profile_by_id(sel[6:]))
    if sel == "/winks":
        return page_my_winks()
    if sel == "/match":
        return page_quiz()
    if sel == "/match/today":
        return page_match_today()
    m = re.fullmatch(r"/match/([a-z]+)/([a-z]+)", sel)
    if m and m.group(1) in HABITATS and m.group(2) in VIBES:
        return page_match_result(m.group(1), m.group(2))
    if sel == "/interests":
        return page_interests()
    if sel in ("/s", "/search"):
        return page_search(search)
    if sel.startswith("/s/"):
        return page_search(sel[3:])
    if sel == "/about":
        return page_about()
    return page_not_found(sel)


def render_html(page):
    """Render a gopher page as minimal HTML for web browsers."""
    out = [
        "<!doctype html>",
        '<html><head><meta charset="utf-8">',
        "<title>GopherMatch — dating for gophers</title>",
        "<style>",
        "body { background:#12100d; color:#d9d2c5;",
        "  font-family:'Courier New', ui-monospace, monospace; margin:0; }",
        "pre { font-size:15px; line-height:1.55; max-width:760px;",
        "  margin:0 auto; padding:2em 1.25em 3em; }",
        "a { color:#9fc978; text-decoration:underline; }",
        "a:hover { color:#d2f3a8; }",
        "</style></head><body><pre>",
    ]
    for line in page.splitlines():
        m = re.match(r"^([t123])\t(.+)\t(.+)\t(.+)$", line)
        if m and m.group(4) == HOSTPORT:
            _, title, sel, _ = m.groups()
            out.append(f'<a href="{quote(sel, safe="/")}">'
                       f"{html_mod.escape(title)}</a>")
        else:
            out.append(html_mod.escape(line))
    out.append("</pre></body></html>")
    return "\n".join(out)


class HTTPHandler(BaseHTTPRequestHandler):
    """Serve the same pages over HTTP so web browsers work too."""

    def do_GET(self):
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)
        page = route(parsed.path, qs.get("q", [""])[0])
        body = render_html(page).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):  # keep the console quiet
        pass


class Handler(socketserver.BaseRequestHandler):
    def handle(self):
        try:
            raw = self.request.recv(4096)
            line = raw.split(b"\r\n", 1)[0].decode("latin-1", "replace").strip()
            parts = line.split("\t")
            selector = parts[0].strip() if parts else ""
            search = parts[1].strip() if len(parts) > 1 else ""
            body = route(selector, search)
            self.request.sendall(body.encode("utf-8") + b"\r\n\r\n")
        except Exception as e:  # keep the server up, tell the client
            try:
                self.request.sendall(f"  500: {e}\r\n\r\n".encode("utf-8"))
            except OSError:
                pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main():
    global HOSTPORT
    ap = argparse.ArgumentParser(
        description="GopherMatch — a dating site for gophers over Gopher")
    ap.add_argument("--port", type=int, default=DEFAULT_PORT,
                    help="listen port (default 7070; classic gopher port 70 "
                         "needs root)")
    ap.add_argument("--host", default="0.0.0.0", help="bind address")
    ap.add_argument("--http-port", type=int, default=0,
                    help="also serve over HTTP for web browsers (0 = off)")
    args = ap.parse_args()

    HOSTPORT = f"localhost:{args.port}"
    srv = Server((args.host, args.port), Handler)
    print(f"  GopherMatch listening:  gopher://{args.host}:{args.port}/")
    print(f"  try:  linx gopher://localhost:{args.port}/")
    print(f"        printf '\\r\\n' | nc localhost {args.port}")
    if args.http_port:
        httpd = ThreadingHTTPServer((args.host, args.http_port), HTTPHandler)
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        print(f"  web (HTTP, for browsers):  http://{args.host}:{args.http_port}/")
    srv.serve_forever()


if __name__ == "__main__":
    main()
