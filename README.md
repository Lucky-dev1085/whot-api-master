# Whot Game REST API 

https://intelia.atlassian.net/wiki/spaces/IW/pages/112623629/WHOT+Game


## Documentation

The API documentation is available [here](http://localhost:3000/apidocs).

## Development

### System Setup

Your system will need to have the following software installed:

  * [make](https://www.gnu.org/software/make/)
  * [git-subrepo](https://github.com/ingydotnet/git-subrepo) (>= 0.4.0)
  * [jq](https://stedolan.github.io/jq/) (>= 1.5)
  * [envsubst](https://www.gnu.org/software/gettext/manual/html_node/envsubst-Invocation.html)
  * [standard-version](https://github.com/conventional-changelog/standard-version)

### Getting Started

#### Step 1: clone the repository

```bash
git clone git@github.com:intelia/whot-api.git whot-api
cd whot-api
```

#### Step 2: setup environment

Copy `env.sample` to `.env` and customise settings for your case. If needed, create a database according to your configuration settings.

#### Step 3: install NPM packages

```bash
npm i
```

#### Step 4: bootstrap the database

Setup/create a new postgresql database and user/role
  1. CREATE USER "whot-dev" WITH PASSWORD 'whot';
  1. CREATE DATABASE "whot-dev" OWNER "whot-dev" ENCODING 'utf8';

```bash
make dbreset && make dbseed name=test-users
```

#### Step 5: Run the tests

```bash
npm test
```

#### Step 6: start in development mode

```bash
make
```

#### Additional Help

Type `make help` for a list of useful commands during development.

### Commiting Changes

Please adhere to the [Conventional Commits](https://www.conventionalcommits.org) specifications when commiting code.

### Deployment

The API is configured to build and push a docker image to the google cloud container registry at 'gcr.io/intelia_hosting'. See the Dockerfile in the repo root for build details.

```bash
make build-image && make publish-image
```
