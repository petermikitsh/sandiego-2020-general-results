# sandiego-2020-general-results

## Getting started

```
nvm use
yarn install
yarn start
```

Then go to http://0.0.0.0:8080.

Running production build

```
yarn build:client
yarn serve
```

Then go to http://0.0.0.0:8080.

### Data Sources

- Recall: https://www.livevoterturnout.com/sandiegoca/LiveResults/en/Index_13.html

### Deploying updates

```
yarn build:data
yarn build:client
yarn deploy
```
