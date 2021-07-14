# Lambda PDF Core
**Authors:** Franz Lacherbauer ([@frnzetti](https://github.com/frnzetti)) and Frank Schiemann ([@aquastars](https://github.com/aquastars)) for Das Büro am Draht GmbH 2021

![](https://bad-opensource.github.io/lambda-pdf-core/LamdaPDF.png)

this module provides all the basic function for PDF development an creation using handlebars templates, puppeteer and serverless.

It coveres 2 usecases for PDF generation

1. PDFs with predifined JSON data

2. PDFs with data being fetched within the lambda function using a fetchCallback

### Constructor Params

```javascript
const handler = require('@bad-opensource/lambda-pdf-core')(
    { version,
      templates = {},
      helpers,
      mocks,
      schema,
      patchDataBeforeRendering,
      config,
      fetchCb }
    );
```

- **Version:** NPM Version

- **templates:** handlebars templates to be used for this PDFs

- **helpers:** handlebars custom helper functions

- **mocks:** mockdata to be used in develop mode

- **schema:** data schema for validation before rendering

- **patchDataBeforeRendering (optional):** custom transformation function enabling last DOM transformations (patchData callback)

- **config:** basic configurations like margins and fallbacks

- **fetchCb:** fetch data callback (optional)


### Public methods of lambda-core instances ('handler')

#### 1. methods using JSON data directly

```javascript
    module.html = async event => pipe(warmUp, parse, validate, patchData, returnHtml)(event);
    module.pdf = async event => pipe(warmUp, parse, validate, patchData, returnPdf)(event);
    module.debug = async event => pipe(warmUp, parse, validate, patchData, returnDebug)(event);
```

#### 2. methods for PDFs with async data fetching

```javascript
    module.fetchHtml = async event => pipe(warmUp, fetchData, validate, patchData, returnHtml)(event);
    module.fetchPdf = async event => pipe(warmUp, fetchData, validate, patchData, returnPdf)(event);
    module.fetchDebug = async event => pipe(warmUp, fetchData, validate, patchData, returnDebug)(event);
```

- ***html** methods return HTML files for debugging in the browser

- ***pdf** methods return PDF files

- ***debug**  methods return the transformated renderdata JSON for debugging

#### internal pipeline methods

- **warmUp:** Internal method waiting for the lambda instance to be up and running

- **parse:** Pass through handling of the given input data (event)
    _or_
- **fetchData:** CallBack function for fetching data

- **validate:** Validation of the given data using a provided schema

- **patchData:** CallBack function (optional) for last HTML DOM manipulations (e.g. patching of image sources) before the final rendering 
