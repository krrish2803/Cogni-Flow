const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const WordExtractor = require('word-extractor');
const AppError = require('../utils/AppError');

const maxCharacters = 30000;

function normalize(text) {
  return text.replace(/\s+/g, ' ').trim();
}

async function extractText(file) {
  if (!file) throw new AppError('Choose a syllabus or study document to upload.', 400);
  const extension = path.extname(file.originalname).toLowerCase();
  let extracted;
  try {
    if (extension === '.pdf') extracted = (await pdfParse(file.buffer)).text;
    if (extension === '.docx') extracted = (await mammoth.extractRawText({ buffer: file.buffer })).value;
    if (extension === '.doc') extracted = (await new WordExtractor().extract(file.buffer)).getBody();
    if (extension === '.txt') extracted = file.buffer.toString('utf8');
  } catch (_) {
    throw new AppError('We could not read this document. Try exporting it as a text-based PDF or DOCX.', 422);
  }
  const text = normalize(extracted || '');
  if (text.length < 40) throw new AppError('No readable syllabus text was found. Upload a text-based PDF, DOC, DOCX, or TXT file.', 422);
  return { text: text.slice(0, maxCharacters), textLength: text.length, truncated: text.length > maxCharacters };
}

module.exports = { extractText };
