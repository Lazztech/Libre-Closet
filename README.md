# Libre Closet

> Your wardrobe. Your data.

A free, open-source, self-hosted wardrobe organizer. Catalog your clothes, upload photos, build outfits, and access everything from your phone as an offline-ready PWA - all on your own server.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Version](https://img.shields.io/github/v/tag/lazztech/libre-closet?label=Version&color=green)](https://github.com/lazztech/libre-closet/tags)
[![GHCR Pulls](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fipitio.github.io%2Fbackage%2FLazztech%2FLibre-Closet%2Flibre-closet.json&query=downloads&label=GHCR%20pulls&logo=github&logoColor=959da5&labelColor=333a41)](https://github.com/lazztech/libre-closet/pkgs/container/libre-closet)
[![Docker Pulls](https://img.shields.io/docker/pulls/lazztech/libre-closet?logo=docker&logoColor=959da5&labelColor=333a41&label=Docker%20Pulls)](https://hub.docker.com/r/lazztech/libre-closet)
[![Join the Discussion](https://img.shields.io/badge/Community-Join%20the%20Discussion-2EA44F?logo=github&logoColor=white&labelColor=1F2937)](https://github.com/Lazztech/Libre-Closet/discussions)

Crafted and engineered with care and intention by [Lazztech LLC](https://lazz.tech/about) 🖤

---

## News

**`v0.2.0` Released! - April 10, 2026**

#### Released

- `v0.2.2 - April 17, 2026:` Garment and Outfit names now optional
- `v0.2.1 - April 15, 2026:` fix empty outfit click area
- `v0.2.0 - April 10, 2026:` Clueless inspired outfit builder, Outfit Scheduling, Image Background Removal, & Customizable categories
- `v0.1.9 - March 19, 2026:` Garment list now orders by most recently added
- `v0.1.8 - March 13, 2026:` Added French, German, and Spanish language support.

For full details refer to the [CHANGELOG](CHANGELOG.md).

---

## Quick start

```bash
docker run -d \
  -p 3000:3000 \
  -v librecloset_data:/app/data \
  ghcr.io/lazztech/libre-closet
```

Open [http://localhost:3000](http://localhost:3000). No account required by default.

**Want to try it without self-hosting?** A public instance is running at [https://librecloset.lazz.tech](https://librecloset.lazz.tech) - register a free account to get started. No guest login exists, but registration is instant and requires no email verification.

---

## Screenshots

Note, these screenshots are taken of the web application viewed as an installed standalone PWA. This tool may also be used like a traditional web app in the browser.

| Wardrobe (Mobile)                                      | Outfits (Mobile)                                 | Outfit Schedule (Mobile)                                 | Outfit Builder (Mobile)                          |
| ------------------------------------------------------ | ------------------------------------------------ | -------------------------------------------------------- | ------------------------------------------------ |
| ![Wardrobe grid](screenshots/Screenshot_mobile_1.webp) | ![Outfits](screenshots/Screenshot_mobile_2.webp) | ![Outfit Schedule](screenshots/Screenshot_mobile_3.webp) | ![Outfit ](screenshots/Screenshot_mobile_4.webp) |

| Wardrobe (Desktop)                              | Outfits (Desktop)                         | Outfit Schedule (Desktop)                         | Outfit Builder (Desktop)                        |
| ----------------------------------------------- | ----------------------------------------- | ------------------------------------------------- | ----------------------------------------------- |
| ![Wardrobe grid](screenshots/Screenshot_1.webp) | ![Outfits](screenshots/Screenshot_2.webp) | ![Outfit Schedule](screenshots/Screenshot_3.webp) | ![Outfit detail](screenshots/Screenshot_4.webp) |

---

## Features

- **Garment catalog** - name, category, brand, size, colors, notes, photo
- **Customizable categories** - custom category support with filtering and input suggestion as you type
- **Outfit builder** - combine garments into saved looks with the Clueless inspired outfit builder
- **Outfit Scheduling** - schedule out multiple outfits for given days through the week and get a view of what you've worn
- **Image Background Removal** - Images automatically have their backgrounds removed and optimized WebP upon upload
- **Offline-ready PWA** - install to home screen, works without internet
- **Optional auth** - run open for personal use or enable JWT accounts for multi-user
- **S3 or local storage** - local disk by default, swap to any S3-compatible provider
- **SQLite or PostgreSQL** - SQLite by default, PostgreSQL for scale
- **Multi-language** - UI available in English, Italian, French, German, and Spanish

---

## Self-hosting

### Docker (recommended)

```bash
# SQLite + local storage (simplest)
docker run -d \
  -p 3000:3000 \
  -v librecloset_data:/app/data \
  ghcr.io/lazztech/libre-closet
```

### docker-compose

```yaml
services:
  libre-closet:
    image: ghcr.io/lazztech/libre-closet
    ports:
      - '3000:3000'
    volumes:
      - librecloset_data:/app/data
    environment:
      AUTH_ENABLED: 'false'
      PWA_ENABLED: 'true'
      DATA_PATH: /app/data
    restart: unless-stopped

volumes:
  librecloset_data:
```

### Build from source

```bash
git clone https://github.com/lazztech/libre-closet
cd libre-closet
cp .env .env.local     # override defaults locally (gitignored)
npm install
npm run start:prod
```

---

## Configuration

`.env` contains committed defaults. Override any value via a `.env.local` file (gitignored) or by passing real environment variables to Docker.

| Variable                           | Description                                                                                                                                                                                                                                                                                                                            | Default        | Example                                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------- |
| `APP_NAME`                         | Display name shown in the UI and navbar                                                                                                                                                                                                                                                                                                | `Libre Closet` | `My awesome Closet manager`                                                               |
| `DATA_PATH`                        | Directory for SQLite DB and uploaded files                                                                                                                                                                                                                                                                                             | `./data`       | `./libre-closet-data`                                                                     |
| `AUTH_ENABLED`                     | Enable JWT user accounts and login                                                                                                                                                                                                                                                                                                     | `false`        | `true`                                                                                    |
| `PWA_ENABLED`                      | Enable service worker and PWA install prompt                                                                                                                                                                                                                                                                                           | `false`        | `true`                                                                                    |
| `ACCESS_TOKEN_SECRET`              | JWT signing secret - **change for production**                                                                                                                                                                                                                                                                                         | `ChangeMe!`    | `u9n8c2y847rfctb23468tcb689f243`                                                          |
| `DATABASE_TYPE`                    | `sqlite` or `postgres`                                                                                                                                                                                                                                                                                                                 | `sqlite`       | `postgres`                                                                                |
| `DATABASE_HOST`                    | Postgres host                                                                                                                                                                                                                                                                                                                          | -              | `192.168.10.5`                                                                            |
| `DATABASE_PORT`                    | Postgres port                                                                                                                                                                                                                                                                                                                          | `5432`         | `9867`                                                                                    |
| `DATABASE_USER`                    | Postgres user                                                                                                                                                                                                                                                                                                                          | -              | `postgres`                                                                                |
| `DATABASE_PASS`                    | Postgres password                                                                                                                                                                                                                                                                                                                      | -              | `7yfhcn2349cr32f`                                                                         |
| `DATABASE_SCHEMA`                  | Postgres schema                                                                                                                                                                                                                                                                                                                        | `postgres`     | `libre-closet-schema`                                                                     |
| `DATABASE_SSL`                     | Use SSL for Postgres                                                                                                                                                                                                                                                                                                                   | `false`        | `true`                                                                                    |
| `FILE_STORAGE_TYPE`                | `local` or `object` (S3)                                                                                                                                                                                                                                                                                                               | `local`        | `object`                                                                                  |
| `OBJECT_STORAGE_ACCESS_KEY_ID`     | S3 access key                                                                                                                                                                                                                                                                                                                          | -              | `AKIAIOSFODNN7EXAMPLE`                                                                    |
| `OBJECT_STORAGE_SECRET_ACCESS_KEY` | S3 secret key                                                                                                                                                                                                                                                                                                                          | -              | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`                                                |
| `OBJECT_STORAGE_ENDPOINT`          | S3-compatible endpoint URL                                                                                                                                                                                                                                                                                                             | -              | `https://s3.example.com:8443`                                                             |
| `OBJECT_STORAGE_REGION`            | S3 region                                                                                                                                                                                                                                                                                                                              | `us-east-1`    | `us-west-1`                                                                               |
| `OBJECT_STORAGE_BUCKET_NAME`       | S3 bucket name                                                                                                                                                                                                                                                                                                                         | `libre-closet` | `my-awesome-closet-manager-bucket`                                                        |
| `EMAIL_FROM_ADDRESS`               | From address for password reset emails                                                                                                                                                                                                                                                                                                 | -              | `LibreCloset@example.com`                                                                 |
| `EMAIL_TRANSPORT`                  | `gmail` or `mailgun`                                                                                                                                                                                                                                                                                                                   | `gmail`        | `mailgun`                                                                                 |
| `EMAIL_API_KEY`                    | Mailgun API key                                                                                                                                                                                                                                                                                                                        | -              | `fyhn2437cryb248cbrdc32`                                                                  |
| `PUBLIC_VAPID_KEY`                 | Web push - generate for production                                                                                                                                                                                                                                                                                                     | -              | `BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U` |
| `PRIVATE_VAPID_KEY`                | Web push - generate for production                                                                                                                                                                                                                                                                                                     | -              | `UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls`                                             |
| `SERVER_BG_REMOVAL_ENABLED`        | Enable server-side ONNX inference as fallback when client-side removal didn't run (e.g. older browser) or to lazily remove background from garments uploaded before background removal shipped. Disable on very low-powered hosts to prevent CPU spikes If `false`: nobg endpoint redirects to original, client-side script not loaded | `true`         | `false`                                                                                   |
| `SERVER_BG_REMOVAL_CONCURRENCY`    | Max concurrent server-side ONNX inference jobs (fallback path only)                                                                                                                                                                                                                                                                    | `1`            | `1`                                                                                       |
| `SERVER_BG_REMOVAL_MODEL`          | ONNX model size for server-side background removal (`small`, `medium`, `large`)                                                                                                                                                                                                                                                        | `small`        | `medium`                                                                                  |

Generate JWT secret:

```bash
openssl rand -base64 60
```

Generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

---

## Development

### Prerequisites

- Node (see `.nvmrc`) - install via [nvm](https://github.com/nvm-sh/nvm)
- Docker (optional, for Postgres testing)

```bash
nvm install && nvm use
npm install
cp .env .env.local     # override defaults locally (gitignored)
npm run start:dev
```

### Scripts

```bash
npm run start:dev       # watch mode
npm run start:prod      # production
npm run test            # unit tests
npm run test:e2e        # Playwright end-to-end
npm run test:cov        # coverage
npm run precommit       # lint + test + lighthouse (run before committing)
```

### Migrations

```bash
# SQLite (build first due to config differences)
npm run build
npx mikro-orm migration:create --config mikro-orm.sqlite.cli-config.ts

# PostgreSQL
npx mikro-orm migration:create --config mikro-orm.postgres.cli-config.ts
```

### Docker build

```bash
# Build image
docker build --no-cache -f docker/Dockerfile . -t libre-closet:latest

# Cross-compile for linux/amd64 (e.g. building on Apple Silicon for a VPS)
docker buildx build --platform linux/amd64 --no-cache -f docker/Dockerfile . -t libre-closet:latest
```

---

## Deployment recommendations

For most self-hosters: deploy to a VPS via [Coolify](https://coolify.io/) or Portainer using the docker-compose above with SQLite + local storage. SQLite handles thousands of users without issue - see [DjangoCon 2023: Use SQLite in Production](https://youtu.be/yTicYJDT1zE).

If you need horizontal scaling later, switch to S3-compatible storage and add [Litestream](https://litestream.io/) for streaming SQLite backups before considering a PostgreSQL migration.

---

## Contributing

PRs and issues are welcome. This project is licensed under AGPL-3.0 - contributions must be compatible with that license.

---

## License

[GNU AGPL-3.0](LICENSE)

---

## Star History

[![Star History Chart](https://api.star-history.com/image?repos=Lazztech/Libre-Closet&type=date&legend=top-left)](https://www.star-history.com/?repos=Lazztech%2FLibre-Closet&type=date&legend=top-left)
