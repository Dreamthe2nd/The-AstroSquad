const { unified } = require('unified');
const remarkParse = require('remark-parse');
const remarkMath = require('remark-math');
const remarkRehype = require('remark-rehype');
const rehypeKatex = require('rehype-katex');
const rehypeStringify = require('rehype-stringify');

// In ES modules or commonjs
console.log('Testing unified markdown with remarkMath...');
