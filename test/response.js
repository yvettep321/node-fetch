import * as stream from 'node:stream';
import chai from 'chai';
import {Response, Blob} from '../src/index.js';
import TestServer from './utils/server.js';

const {expect} = chai;

describe('Response', () => {
	const local = new TestServer();
	let base;

	before(async () => {
		await local.start();
		base = `http://${local.hostname}:${local.port}/`;
	});

	after(async () => {
		return local.stop();
	});

	it('should have attributes conforming to Web IDL', () => {
		const res = new Response();
		const enumerableProperties = [];
		for (const property in res) {
			enumerableProperties.push(property);
		}

		for (const toCheck of [
			'body',
			'bodyUsed',
			'arrayBuffer',
			'blob',
			'json',
			'text',
			'type',
			'url',
			'status',
			'ok',
			'redirected',
			'statusText',
			'headers',
			'clone'
		]) {
			expect(enumerableProperties).to.contain(toCheck);
		}

		for (const toCheck of [
			'body',
			'bodyUsed',
			'type',
			'url',
			'status',
			'ok',
			'redirected',
			'statusText',
			'headers'
		]) {
			expect(() => {
				res[toCheck] = 'abc';
			}).to.throw();
		}
	});

	it('should support empty options', () => {
		const res = new Response(stream.Readable.from('a=1'));
		return res.text().then(result => {
			expect(result).to.equal('a=1');
		});
	});

	it('should support parsing headers', () => {
		const res = new Response(null, {
			headers: {
				a: '1'
			}
		});
		expect(res.headers.get('a')).to.equal('1');
	});

	it('should decode responses containing BOM to json', async () => {
		const json = await new Response('\uFEFF{"a":1}').json();
		expect(json.a).to.equal(1);
	});

	it('should decode responses containing BOM to text', async () => {
		const text = await new Response('\uFEFF{"a":1}').text();
		expect(text).to.equal('{"a":1}');
	});

	it('should keep BOM when getting raw bytes', async () => {
		const ab = await new Response('\uFEFF{"a":1}').arrayBuffer();
		expect(ab.byteLength).to.equal(10);
	});

	it('should support text() method', () => {
		const res = new Response('a=1');
		return res.text().then(result => {
			expect(result).to.equal('a=1');
		});
	});

	it('should support json() method', () => {
		const res = new Response('{"a":1}');
		return res.json().then(result => {
			expect(result.a).to.equal(1);
		});
	});

	it('should support buffer() method', () => {
		const res = new Response('a=1');
		return res.buffer().then(result => {
			expect(result.toString()).to.equal('a=1');
		});
	});

	it('should support blob() method', () => {
		const res = new Response('a=1', {
			method: 'POST',
			headers: {
				'Content-Type': 'text/plain'
			}
		});
		return res.blob().then(result => {
			expect(result).to.be.an.instanceOf(Blob);
			expect(result.size).to.equal(3);
			expect(result.type).to.equal('text/plain');
		});
	});

	it('should support clone() method', () => {
		const body = stream.Readable.from('a=1');
		const res = new Response(body, {
			headers: {
				a: '1'
			},
			url: base,
			status: 346,
			statusText: 'production',
			highWaterMark: 789
		});
		const cl = res.clone();
		expect(cl.headers.get('a')).to.equal('1');
		expect(cl.type).to.equal('default');
		expect(cl.url).to.equal(base);
		expect(cl.status).to.equal(346);
		expect(cl.statusText).to.equal('production');
		expect(cl.highWaterMark).to.equal(789);
		expect(cl.ok).to.be.false;
		// Clone body shouldn't be the same body
		expect(cl.body).to.not.equal(body);
		return cl.text().then(result => {
			expect(result).to.equal('a=1');
		});
	});

	it('should support stream as body', () => {
		const body = stream.Readable.from('a=1');
		const res = new Response(body);
		return res.text().then(result => {
			expect(result).to.equal('a=1');
		});
	});

	it('should support string as body', () => {
		const res = new Response('a=1');
		return res.text().then(result => {
			expect(result).to.equal('a=1');
		});
	});

	it('should support ArrayBuffer as body', () => {
		const encoder = new TextEncoder();
		const res = new Response(encoder.encode('a=1'));
		return res.text().then(result => {
			expect(result).to.equal('a=1');
		});
	});

	it('should support blob as body', async () => {
		const res = new Response(new Blob(['a=1']));
		return res.text().then(result => {
			expect(result).to.equal('a=1');
		});
	});

	it('should support Uint8Array as body', () => {
		const encoder = new TextEncoder();
		const res = new Response(encoder.encode('a=1'));
		return res.text().then(result => {
			expect(result).to.equal('a=1');
		});
	});

	it('should support DataView as body', () => {
		const encoder = new TextEncoder();
		const res = new Response(new DataView(encoder.encode('a=1').buffer));
		return res.text().then(result => {
			expect(result).to.equal('a=1');
		});
	});

	it('should default to null as body', () => {
		const res = new Response();
		expect(res.body).to.equal(null);

		return res.text().then(result => expect(result).to.equal(''));
	});

	it('should default to 200 as status code', () => {
		const res = new Response(null);
		expect(res.status).to.equal(200);
	});

	it('should default to empty string as url', () => {
		const res = new Response();
		expect(res.url).to.equal('');
	});

	it('should cast string to stream using res.body', () => {
		const res = new Response('hi');
		expect(res.body).to.be.an.instanceof(stream.Readable);
	});

	it('should cast typed array to stream using res.body', () => {
		const res = new Response(Uint8Array.from([97]));
		expect(res.body).to.be.an.instanceof(stream.Readable);
	});

	it('should cast blob to stream using res.body', () => {
		const res = new Response(new Blob(['a']));
		expect(res.body).to.be.an.instanceof(stream.Readable);
	});

	it('should not cast null to stream using res.body', () => {
		const res = new Response(null);
		expect(res.body).to.be.null;
	});

	it('should cast typed array to text using res.text()', async () => {
		const res = new Response(Uint8Array.from([97]));
		expect(await res.text()).to.equal('a');
	});

	it('should cast stream to text using res.text() in a roundabout way', async () => {
		const {body} = new Response('a');
		expect(body).to.be.an.instanceof(stream.Readable);
		const res = new Response(body);
		expect(await res.text()).to.equal('a');
	});

	it('should support error() static method', () => {
		const res = Response.error();
		expect(res).to.be.an.instanceof(Response);
		expect(res.type).to.equal('error');
		expect(res.status).to.equal(0);
		expect(res.statusText).to.equal('');
	});

	it('should warn once when using .data (response)', () => new Promise(resolve => {
		process.once('warning', evt => {
			expect(evt.message).to.equal('data doesn\'t exist, use json(), text(), arrayBuffer(), or body instead');
			resolve();
		});

		new Response('a').data;
	}));
});
