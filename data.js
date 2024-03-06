import cheerio from "cheerio";
import axios from "axios";
import express from "express";
import { readFile } from "fs/promises";
// Import the `config` function from the `dotenv` package
import { config } from 'dotenv';
//https://stackoverflow.com/questions/8817423/why-is-dirname-not-defined-in-node-repl
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import { updateDB } from './store.js';

// Load environment variables from the .env file
config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

const fetchVerbs = async (wiki) => {
  
  try {
    const response = await axios.get(wiki);
    const $$ = cheerio.load(response.data);
    const verb = $$("tr > td > p ").text();

    const lines = verb
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const verbs = [];
    for (let i = 0; i < lines.length; i += 2) {
      const type = lines[i];
      const text = lines[i + 1];
      verbs.push({ type, text });
    }

    return verbs;
  } catch (error) {
    return "verbs not found";
  }
};

app.get("/", async (req, res) => {
  try {
    const htmlContent = await readFile(__dirname + "/index.html", "utf-8");
    res.send(htmlContent);
  } catch (error) {
    res.status(500).send(`Internal Server Error ${(process.env.DEV || false)?String(error):'PRODUCTION'}`);
  }
});

app.get("/api/dictionary/:language/:entry", async (req, res) => {
  const entry = req.params.entry;
  const language = req.params.language;
  const url = `https://dictionary.cambridge.org/us/dictionary/${language}/${entry}`;

  try {
    const response  = await fetch(url);
    if (!response.ok) {
      res.status(404).json({
        error: "word not found",
      });
      return; // Stop execution here
    }
    const html = await response.text(); 
    const $ = cheerio.load(html);
    const siteurl = "https://dictionary.cambridge.org";
    const wiki = `https://simple.wiktionary.org/wiki/${entry}`;

    // get verbs
    const verbs = await fetchVerbs(wiki);

    // process.exit(1);
    // basic
    const word = $(".hw.dhw").first().text();
    const pos = $(".pos.dpos")
      .map((index, element) => {
        return $(element).text();
      })
      .get();

    const usaudio = siteurl + $(".us.dpron-i audio source").first().attr("src");
    const uspron = $(".us.dpron-i .pron.dpron").first().text();
    const ukaudio = siteurl + $(".uk.dpron-i audio source").first().attr("src");
    const ukpron = $(".uk.dpron-i .pron.dpron").first().text();

    // definition & example
    const exampleCount = $(".def-body.ddef_b")
      .map((index, element) => {
        const exampleElements = $(element).find(".examp.dexamp");
        return exampleElements.length;
      })
      .get();
    for (let i = 0; i < exampleCount.length; i++) {
      if (i == 0) {
        exampleCount[i] = exampleCount[i];
      } else {
        exampleCount[i] = exampleCount[i] + exampleCount[i - 1];
      }
    }

    const exampletrans = $(".examp.dexamp > .trans.dtrans.dtrans-se.hdb.break-cj");
    const example = $(".examp.dexamp > .eg.deg")
      .map((index, element) => {
        return {
          id: index,
          text: $(element).text(),
          translation: exampletrans.eq(index).text(),
        };
      })
      .get();

    const definitiontrans = $(".def-body.ddef_b > .trans.dtrans.dtrans-se.break-cj");
    const definition = $(".def.ddef_d.db")
      .map((index, element) => {
        return {
          id: index,
          text: $(element).text(),
          translation: definitiontrans.eq(index).text(),
          example: example.slice(exampleCount[index - 1], exampleCount[index]),
        };
      })
      .get();

    // api response
    if (word === "") {
      res.status(404).json({
        error: "word not found",
      });
    } else {
var resJSON={
  word: word,
  pos: pos,
  verbs: verbs,
  pronunciation: [
    {
      lang: "us",
      url: usaudio,
      pron: uspron,
    },
    {
      lang: "uk",
      url: ukaudio,
      pron: ukpron,
    },
  ],
  definition: definition,
};
      await updateDB( resJSON);
      res.status(200).json(resJSON);
    }
  } catch (error) {
    console.log(error)
    res.status(500).json({
      error: `Internal Server Error ${(process.env.DEV || false)?String(error):'PRODUCTION'}`,
    });
  }
});

export default app;
