# abstract-request

## Description

Lightweight facade for node-fetch or any other low-level HTTP requesting library.
It's used for loosely coupling transport HTTP layer in my API clients implementations for various services.
Designed for Google CloudFunctions environment.

## Features

* NodeJS
* TypeScript
* Promises
* node-fetch (https://github.com/node-fetch/node-fetch) - Low level HTTP transport
* xojs/xo (https://github.com/xojs/xo) with plugins for TypeScript - Linting
* jasmine (https://github.com/jasmine/jasmine) - Testing
* nyc (https://github.com/istanbuljs/nyc) - Tests Coverage

## Installation

```
npm install --save @dobromyslov/abstract-request
```

## Usage

Have a look at usage examples in tests `/spec/abstract-request.spec.ts`.

Here is a common usage example:

```typescript
import {AbstractRequest, Response, URL} from '@dobromyslov/abstract-request';

/**
 * Response I expect to get from API method https://api.example.com/some-method.
 */
export class MyResponse {
    a?: string;
}

/**
 * My client request to some API method https://api.example.com/some-method.
 * The method has one query parameter called myRequestParameter
 * e.g. https://api.example.com/some-method?myRequestParameter=value
 */
export class MyRequest extends AbstractRequest<MyResponse> {
    protected baseUrl = 'https://api.example.com';
    protected httpMethod = 'GET' as const;
    protected myRequestParameter: string;

    constructor(myRequestParameter: string) {
        super();
        this.myRequestParameter = myRequestParameter;
    }

    getUrlWithParams(): URL {
        this.queryParams['myRequestParameter'] = this.myRequestParameter;
        return super.getUrlWithParams();
    }

    protected processResponse(response: Response): Promise<MyResponse> {
        return response.text().then(text => {
            return Object.assign(new MyResponse(), JSON.parse(text));
        });
        // Or you may use embedded json conversion
        //return response.json().then(obj => {
        //    return Object.assign(new MyResponse(), obj);
        //});
    }
}

// create new request
const myRequest = new MyRequest('myRequestParameter-value');

// execute
myRequest.execute().then(response => {
    console.log(response.a);
}).catch(error => {
    console.log('Error: ' + error.toString());
});
``` 

## License

MIT (c) 2020 Viacheslav Dobromyslov <<viacheslav@dobromyslov.ru>>
