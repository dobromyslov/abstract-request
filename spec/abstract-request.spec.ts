import {AbstractRequest} from '../src';
import {Response} from 'node-fetch';
import {URL} from 'url';

const nestedParams = {
    a: {
        a1: 'value-a1',
        a2: 'value-a2'
    },
    b: 'value-b',
    c: {
        c1: {
            c2: 'value-c2'
        },
        c3: 'value-c3'
    }
};

const plainParams = {
    'a[a1]': 'value-a1',
    'a[a2]': 'value-a2',
    'b': 'value-b',
    'c[c1][c2]': 'value-c2',
    'c[c3]': 'value-c3'
};

class A extends AbstractRequest<String>{
    protected baseUrl: string = 'http://google.com';
    protected httpMethod = 'GET' as const;

    getUrlWithParams(): URL {
        this.queryParams = nestedParams;
        return super.getUrlWithParams();
    }

    protected async processResponse(response: Response): Promise<String> {
        return new Promise((resolve) => {
            resolve(response.status.toString());
        });
    }
}

class B extends AbstractRequest<String>{
    protected baseUrl: string = 'http://google.com';
    protected httpMethod = 'POST' as const;

    getUrlWithParams(): URL {
        this.queryParams = nestedParams;
        return super.getUrlWithParams();
    }

    protected async processResponse(response: Response): Promise<String> {
        return new Promise((resolve) => {
            resolve(response.status.toString());
        });
    }
}

describe('convertNestedParamsToPlain', () => {
    it('should return plain list of params', () => {
        expect(AbstractRequest.convertNestedQueryParamsToPlainObject(nestedParams)).toEqual(plainParams);
    });
});

describe('queryParams', () => {
   it('should be empty object after init', () => {
       const instanceA = new A();
       expect((instanceA as any).queryParams).toEqual({});
   });
});

describe('getUrl()', () => {
   it('should return valid string', () => {
       const instanceA = new A();
       expect(instanceA.getUrl().toString()).toEqual('http://google.com/');
   });
});

describe('getUrlWithParams()', () => {
   it('should return url with correct search params', () => {
       const instanceA = new A();
       expect(instanceA.getUrlWithParams().toString()).toEqual('http://google.com/?a%5Ba1%5D=value-a1&a%5Ba2%5D=value-a2&b=value-b&c%5Bc1%5D%5Bc2%5D=value-c2&c%5Bc3%5D=value-c3');
   });
});

describe('AbstractRequest', () => {
    it("cant simultaneously have form and json set", () => {
        const instanceB = new B();
        instanceB.form = nestedParams;
        instanceB.json = nestedParams;

        instanceB.execute().catch(err => {expect(err).toEqual(new Error("Can not simultaneously send form and json in one request."))});
    });
});

describe("AbstractRequest", () => {
    it("sends POST request to Google.com and gets 405", async () => {
        const instanceB = new B();
        expect(await instanceB.execute()).toEqual("405");
    });
});

describe("AbstractRequest", () => {
    it("sends GET request with form body to Google.com and gets error", async () => {
        const instanceA = new A();
        instanceA.form = nestedParams;
        await instanceA.execute().catch(err => expect(err).toEqual(new TypeError("Request with GET/HEAD method cannot have body")));
    });
});

describe("AbstractRequest", () => {
    it("sends GET request with JSON body to Google.com and gets error", async () => {
        const instanceA = new A();
        instanceA.json = nestedParams;
        await instanceA.execute().catch(err => expect(err).toEqual(new TypeError("Request with GET/HEAD method cannot have body")));
    });
});
