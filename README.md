# Raga Sangrah

A personal archive of raga recordings, bandish lyrics and raga notes. A static site with no build step.

## Structure

```
raga-archive/
├── index.html                 Page shell
├── assets/
│   ├── img/                   Instrument line art (tanpura, sitar, tabla, bansuri) in the site colours
│   ├── css/styles.css         All styling (design tokens at the top as CSS variables)
│   └── js/
│       ├── main.js            Startup and hash router
│       ├── constants.js       Time slots and data file paths
│       ├── entry-builder.js   Turns form input into data entries and checks them
│       ├── github.js          Commits changes to the repo from the browser
│       ├── store.js           Loads data and answers lookups
│       ├── utils.js           Escaping, YouTube id parsing, small helpers
│       └── views/             One module per page: home, raga, recording, add, add-raga, plus form-kit
├── data/
│   ├── ragas.json             Raga details
│   └── recordings.json        Recordings, lyrics and links
├── scripts/validate-data.mjs  Catches data mistakes before they break the site
├── .github/workflows/         Runs the data check on every push
├── .nojekyll                  Tells GitHub Pages to serve files as they are
└── package.json
```

## Preview locally
Browsers block ES modules and `fetch` on `file://` URLs, so run a local server:

```
npm start
```

Then open http://localhost:8000. This needs Python 3, but any static server works.

## Deploy on GitHub Pages
1. Create a GitHub repository and upload everything in this folder to its root.
2. Go to **Settings > Pages**, set **Source** to "Deploy from a branch", choose `main` and `/ (root)`, then Save.
3. The site goes live at `https://<username>.github.io/<repo>/` within a minute or two.

## Add content with the forms
The site has two admin forms. They are **not linked anywhere on the site**, so visitors will not see them. Open them by typing the address (bookmark both):

- Add a recording: `https://<username>.github.io/<repo>/#/add`
- Add a raga: `https://<username>.github.io/<repo>/#/add-raga`

The addresses are unlisted, not secret. What actually protects your data is the token: without it, nobody can save anything.

GitHub Pages cannot save files by itself, so the forms commit to your repo using a personal access token.

One-time setup:
1. On GitHub go to **Settings > Developer settings > Personal access tokens > Fine-grained tokens** and generate a token.
2. Set **Repository access** to only this repo, and **Permissions > Contents** to **Read and write**.
3. Open either form on the live site, expand **GitHub settings**, enter your username, repo name, branch and the token, then click **Save settings**. The settings are shared by both forms.

After that, fill in a form and click **Save to GitHub**. The change is committed to `data/*.json`, and the live site updates about a minute later. The recording form also lets you pick "Add a new raga…" if you want to add both at once.

The token is stored only in that browser's local storage, so use your own devices and click "Forget token" when done on a shared one. If you prefer not to use a token, "Copy JSON instead" gives you the entry to paste into the data file by hand.

## Add a recording by editing the file
Open `data/recordings.json` on GitHub, click the pencil icon and add an object to the array:

```json
{
  "id": "unique-short-id",
  "raga": "yaman",
  "title": "Recording title",
  "artist": "Artist name",
  "instrument": "Vocal",
  "youtube": "https://www.youtube.com/watch?v=XXXXXXXXXXX",
  "notes": "Optional",
  "bandishes": [
    {
      "title": "Vilambit bandish",
      "start": "0:45",
      "taal": "Ektaal",
      "laya": "Vilambit laya",
      "composer": "",
      "lyrics": "Bandish lines, one per line (use \\n for line breaks)",
      "lyrics_roman": "Optional roman transliteration",
      "lyrics_translation": "Optional translation"
    },
    {
      "title": "Drut bandish",
      "start": "12:30",
      "taal": "Teentaal",
      "laya": "Drut laya",
      "lyrics": "..."
    }
  ]
}
```

- `raga` must match the `id` of an entry in `data/ragas.json`. Add the raga first if it is new.
- `instrument` is "Vocal" or an instrument such as "Sitar". Instrumental recordings with no lyrics hide the lyrics section.
- `youtube` accepts a full link or the 11-character video id.
- A recording can hold any number of bandishes. Each has its own taal, laya, composer and lyrics, and the page shows one section per bandish.
- `start` is optional. With a video, it adds a "Play from 12:30" button that jumps the player to that point. Use `12:30` or `1:05:30`.
- Lyric tabs (Devanagari, Roman, Translation) appear only for the versions you provide.
- Older entries that put `taal`, `laya`, `composer` and `lyrics` directly on the recording still work, and are treated as a single bandish.

## Add a raga
Add an object to `data/ragas.json` with `id`, `name`, `thaat`, `slot`, `time`, `rasa`, `aroha`, `avaroha`, `vadi`, `samvadi` and `description`. `slot` must be one of: Early morning, Morning, Afternoon, Evening, Night, Late night.

## Check your data
After editing, the **Validate data** workflow runs on GitHub and flags problems such as a duplicate id or a recording that points to a missing raga. You can also run `npm run validate` locally.
