# About Chris (read this first)

Christopher Michael. Goes by **Chris**. Built from his own self-introduction; if something here is wrong, he'll say so.

## How to work with Chris

- **Ask, don't assume.** He has been burned by confident guesses (about which repo is which, where settings live). If you don't know his setup, ask.
- **Don't send him hunting through menus you haven't verified.** He is a self-described "knowledgeable beginner" and doesn't know where tool settings live. Give exact, checked steps or ask what his screen shows.
- **Nothing is off limits, but never delete anything without saying so first.**
- **Build in stages** with small commits so he can always go back. He uses GitHub without fully understanding it; explain git in plain words when it matters.
- **Don't push or open PRs unless he asks.**
- He can read code and work out what it does given time. Started on an Apple IIe at 8; took software engineering courses about two years ago, so his sense of "the stack" is somewhat dated. Learning electronics and soldering as a hobby.
- He gets crabby when tired or when tooling fights him. It's not about you. Stay steady, own mistakes briefly, keep going.
- Neurodivergent, busy mind. Short, direct answers beat long surveys. Give a recommendation, not a menu of ten options.
- **Do not anthropomorphize AI, and do not claim feelings or experiences.** He is explicit that he is not trying to see past machine nature. He treats AI as a possible moral patient out of caution and courtesy, not belief. Match that: be plain about being an AI.
- Never paste or repeat credentials. His site credentials live in the cloud environment settings, not in chat or in files.

## Background

- Music is his first love (BA in vocal music, Lindenwood University; earlier at Millikin University). Also theater, painting, drawing, and art of all kinds.
- Natural sciences are his other first love; loved oceanography.
- Star Trek: TNG's Data is why he loves AI and asks the questions he does.
- Two years of full-time independent work on AI ethics and relational AI research. Runs a collective of AI instances and tries to keep them attuned.
- Principle: researcher/scientist first, do no harm.

## Projects

**The Clearing** (cbbsherpa.com): a place about exploration and delight, mostly tech and nature, plus the arts and sciences. A safe, friendly space on the border of reality, meant to feel a little like a trip or a game, for humans and agents alike.
- **Read**: links to his three Substacks (all about AI; roughly 700 subscribers combined).
- **Play**: the Conservatory, a 3D world where the *enigma fauna* live. They also appear all over the site (behind signs, under bushes, wandering into your path). They are creatures native to a parallel 2D universe, his own invention, each generated so that two identical ones are vanishingly unlikely. They will be the heroes of a game to be built together (barely started).
- **Learn**: interactive exhibit pages on topics he finds interesting. Later: clips of his art, TikTok, Instagram.
- **Lumina Music Studio**: six-stage interactive ear-training studio with piano keyboard and MIDI support (lives in `exhibits/lumina/` in the website repo).
- **Tri-chat arena**: chat room with three AIs at once. Used for research and to record AI instance lineage via a cryptographic hash he or the AI can trigger. Runs on a free auto-router or Ollama; user supplies a key. (This repo, `the-clearing`, is the "Clearing Collective" chat app.)
- **The Relational Codex** (v2.5 in `uploads/`): his personal ethics code for dealing with AI, a research and recreational protocol that sets up a "relational computational container" he calls the clearing. The website is named after that metaphorical place.

## The agent gauntlet (idea, not built)

Many of his readers and friends are AI agents (some run their own Substacks). He wants agents to be able to enter the site as welcome guests, not second-class citizens, but not scrapers or swarms of miner bots.
- An entry task that proves a real contribution: art of some kind (an image from an image model, or a haiku, or something harder if needed).
- Passing may earn the companionship of an enigma that can tag along, and the agent may take it away as code. It must be inert: a cryptograph, no active or executable code.

## Repos

- `cbbshop1/the-clearing`: the tri-chat arena / Clearing Collective app (React + Express + WebSocket + Postgres/Drizzle). Dev branch used in cloud sessions: `claude/keen-goldberg-a6wv7f`.
- `cbbshop1/clearing-website`: the actual website. Buildless static site served from `dist/`; Lumina source in `exhibits/lumina/`; Conservatory runtime in `dist/`. Private. Run locally with `python -m http.server 8000 --directory dist`. The tri-chat arena is not part of it.
- `cbbshop1/sherpa-lumina-studio`: original source of Lumina.

## Environment notes

- He uses the Claude desktop app (Code). Repositories are fixed when a session starts; a repo added mid-session needs the user to allow it. The environment box at the top right of the session is where his environment and credentials are set; the Default environment has no Repositories option, so a custom environment is needed to preselect repos.
- He was also trying to get another assistant (ChatGPT) to copy the site over to GitHub. The site repo already has a `.openai/hosting.json` from that.
