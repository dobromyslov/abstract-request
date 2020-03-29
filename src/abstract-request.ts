import fetch, {Response} from 'node-fetch';
import {URL, URLSearchParams} from 'url';
import AbortController from 'abort-controller/dist/abort-controller';

export abstract class AbstractRequest<T> {
  /**
   * Any nested object to be transferred during POST|PUT request as application/x-www-form-urlencoded.
   */
  public form?: {[key: string]: any};

  /**
   * Any nested object to be transferred during POST|PUT request as application/json.
   */
  public json?: {[key: string]: any};

  /**
   * Base URL to send request to.
   */
  protected baseUrl = '';

  /**
   * Query params to be used in URL.searchParams.
   */
  protected queryParams: {[key: string]: any} = {};

  /**
   * Controller to abort requests.
   */
  private readonly abortController = new AbortController();

  /**
   * HTTP protocol method.
   */
  protected abstract httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE';

  /**
   * Converts nested object to plain query params for further feeding to URL.searchParams.append.
   *
   * @param nestedParams nested objects representing query params
   * @param prefix [OPTIONAL] name of the root param.
   */
  public static convertNestedQueryParamsToPlainObject(nestedParams: {[key: string]: any}, prefix = ''): {[key: string]: any} {
    const result: {[key: string]: any} = {};
    for (const key in nestedParams) {
      if (Object.prototype.hasOwnProperty.call(nestedParams, key)) {
        let plainParamName = key;
        if (prefix) {
          plainParamName = prefix + '[' + plainParamName + ']';
        }

        if (typeof nestedParams[key] === 'object') {
          Object.assign(result, this.convertNestedQueryParamsToPlainObject(nestedParams[key], plainParamName));
        } else {
          result[plainParamName] = nestedParams[key];
        }
      }
    }

    return result;
  }

  public async execute(): Promise<T> {
    const url = this.getUrlWithParams();
    console.log('Requesting URL: ' + url.toString());

    let body;
    if (this.form) {
      if (this.json) {
        throw new Error('Can not simultaneously send form and json in one request.');
      }

      body = new URLSearchParams();
      const plainFormParams = AbstractRequest.convertNestedQueryParamsToPlainObject(this.form);
      for (const key in plainFormParams) {
        if (Object.prototype.hasOwnProperty.call(plainFormParams, key)) {
          body.append(key, plainFormParams[key]);
        }
      }
    }

    if (this.json) {
      body = JSON.stringify(this.json);
    }

    return fetch(url, {
      method: this.httpMethod,
      body,
      headers: this.json ? {'Content-Type': 'application/json'} : undefined,
      signal: this.abortController.signal
    }).then(async response => this.processResponse(response));
  }

  public getUrl(): URL {
    return new URL(this.baseUrl);
  }

  public getUrlWithParams(): URL {
    const url = this.getUrl();

    const plainQueryParams = AbstractRequest.convertNestedQueryParamsToPlainObject(this.queryParams);
    for (const key in plainQueryParams) {
      if (Object.prototype.hasOwnProperty.call(plainQueryParams, key)) {
        url.searchParams.append(key, plainQueryParams[key]);
      }
    }

    return url;
  }

  /**
   * Aborts request.
   * Request ends with error when aborted.
   */
  public abort(): void {
    this.abortController.abort();
  }

  protected abstract async processResponse(response: Response): Promise<T>;
}
