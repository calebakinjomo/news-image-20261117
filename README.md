# The World in One Picture — Tuesday 17 November 2026

A newspaper front page that sums up the world's news of Tuesday 17 November 2026 in a single image: Ukraine's second-day strike on the Crimea Bridge as Russia hits Kyiv's bridges, tankers struck by mines near the Strait of Hormuz, the confirmed Xi–Trump–Putin meeting in Shenzhen, the US losing its measles-free status, the Pentagon's ninth straight failed audit, and Cyclone Akvan bearing down on India.

The program draws the whole poster itself — a bitmap font and a PNG encoder written from scratch in Node's standard library — so the image is produced fresh on every run, with no assets and no network.

[![Make.fun bounty](https://make.fun/badge/news-image-20261117.svg)](https://make.fun/bounty/news-image-20261117)
[![Rank](https://make.fun/badge/news-image-20261117/calebakinjomo/news-image-20261117/rank.svg)](https://make.fun/bounty/news-image-20261117)
[![Reward](https://make.fun/badge/news-image-20261117/calebakinjomo/news-image-20261117/reward.svg)](https://make.fun/bounty/news-image-20261117)

## How to run

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes a 1024×1024 PNG to `out/entry.png`. The program is fully deterministic: two runs write byte-identical files.

## Links

- Bounty: https://make.fun/bounty/news-image-20261117
- Play via referral: https://make.fun/r/hdavhdvz
