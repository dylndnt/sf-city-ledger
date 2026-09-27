# San Francisco's money in and out

A small static view of San Francisco's **FY2025 recorded actual revenue and spending** (July 1, 2024 through June 30, 2025). The middle column follows the city's fund classification; it does not assert that an individual revenue dollar paid for an individual service. The source is the Controller's [Spending and Revenue dataset](https://data.sf.gov/d/bpnb-jwfb).

The committed `public/data/fy2025.json` is ready to serve without a live API call. It excludes related governmental units from displayed totals, retains signed transfer adjustments, and shows the city's `data_as_of` date. The original FY2025 CSV and source documentation are in `data/`.

## Local preview

Requires Python 3.13 and Node.js 22. From the repository root:

```sh
python -m unittest discover -s tests -v
node --test tests/model.test.mjs
python -m http.server 8000 --directory public
```

Open `http://localhost:8000`. A `file://` page will not load the JSON through `fetch`.

To rebuild the site JSON from the committed source snapshot:

```sh
python -m scripts.build_data --input data/spending-revenue-fy2025.csv --output public/data/fy2025.json
```

To fetch the latest FY2025 city file and source metadata manually:

```sh
python -m scripts.refresh_data
```

The refresh saves the raw inputs under `build/source/` for inspection. The published JSON changes only after validation succeeds. A malformed or suspiciously short download leaves the last valid file in place. A source change that introduces an unknown revenue or fund type code requires a deliberate mapping update.

## Weekly publication

The GitHub Actions workflow runs **Monday at 20:00 UTC**, after the city's usual Sunday update, and can also run manually. It tests the transformation and page model, downloads the current source, validates it, archives the raw inputs as a workflow artifact, commits a changed JSON snapshot, and publishes `public/` through GitHub Pages. If refresh fails, it deploys the last valid committed JSON and marks the run failed so the maintainer can investigate. The page always displays the city's actual as-of date.

To activate it, put this repository on GitHub with `main` as its default branch. In repository settings, choose **GitHub Actions** as the Pages source and permit Actions to write repository contents. Optionally add a `SOCRATA_APP_TOKEN` repository secret if the public API rate limit becomes a problem. The token is used only in the server-side job.

FY2025 is the only published year. Choose a newer default year only after checking its completeness and the fund and revenue code mapping; the dataset does not provide an explicit audited or closed flag.
