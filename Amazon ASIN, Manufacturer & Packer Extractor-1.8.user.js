// ==UserScript==
// @name         Amazon ASIN, Manufacturer & Packer Extractor
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  Extracts ASIN, Manufacturer, and Packer details from Amazon product pages and saves them to Google Sheets
// @author       Smartrwl
// @match        *://www.amazon.in/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbyTh_BU8XmKM4tfgXHT92bz_tLXCQ8280J0W7N8cYiY4M5AvT6VDVeyxjD0h4z0QdM/exec";

    function extractASIN() {
        let asin = "Not Found";

        // ✅ 1. Extract ASIN from URL
        let asinMatch = window.location.href.match(/(?:dp|gp\/product|product-reviews)\/([A-Z0-9]{10})/);
        if (asinMatch) {
            asin = asinMatch[1];
        }

        // ✅ 2. Extract from Meta Tags (Backup)
        if (asin === "Not Found") {
            let metaASIN = document.querySelector("meta[name='ASIN'], meta[name='keywords']");
            if (metaASIN && metaASIN.content.match(/^[A-Z0-9]{10}$/)) {
                asin = metaASIN.content;
            }
        }

        // ✅ 3. Extract from Hidden ASIN Input Field
        if (asin === "Not Found") {
            let asinElement = document.getElementById("ASIN") || document.querySelector("input[name='ASIN']");
            if (asinElement) {
                asin = asinElement.value.trim();
            }
        }

        // ✅ 4. Extract ASIN from Script Tags (Handles Lazy Loading)
        if (asin === "Not Found") {
            let scriptTags = document.querySelectorAll("script");
            scriptTags.forEach(script => {
                let scriptText = script.innerText || script.textContent;
                let match = scriptText.match(/"ASIN"\s*:\s*"([A-Z0-9]{10})"/);
                if (match) {
                    asin = match[1];
                }
            });
        }

        console.log("🔍 ASIN Extracted:", asin);
        return asin;
    }

    function extractDetails() {
        let asin = extractASIN();
        let manufacturer = "Not Found";
        let packer = "Not Found";

        // ✅ Extract Manufacturer & Packer from Tables
        let tables = document.querySelectorAll("table");
        tables.forEach(table => {
            let rows = table.querySelectorAll("tr");
            rows.forEach(row => {
                let label = row.querySelector("td:first-child, th:first-child");
                let value = row.querySelector("td:last-child, th:last-child");

                if (label && value) {
                    let labelText = label.innerText.trim().toLowerCase();
                    let valueText = value.innerText.trim();

                    if (labelText.includes("manufacturer")) manufacturer = valueText;
                    if (labelText.includes("packer")) packer = valueText;
                }
            });
        });

        // ✅ If manufacturer/packer is inside `<div>` instead of `<table>`, fetch from there
        if (manufacturer === "Not Found") {
            let manufacturerDiv = [...document.querySelectorAll('div')].find(el => el.innerText.toLowerCase().includes("manufacturer"));
            if (manufacturerDiv) {
                manufacturer = manufacturerDiv.nextElementSibling ? manufacturerDiv.nextElementSibling.innerText.trim() : "Not Found";
            }
        }

        if (packer === "Not Found") {
            let packerDiv = [...document.querySelectorAll('div')].find(el => el.innerText.toLowerCase().includes("packer"));
            if (packerDiv) {
                packer = packerDiv.nextElementSibling ? packerDiv.nextElementSibling.innerText.trim() : "Not Found";
            }
        }

        if (asin !== "Not Found" && (manufacturer !== "Not Found" || packer !== "Not Found")) {
            console.log(`📦 Extracted Data:\nASIN: ${asin}\nManufacturer: ${manufacturer}\nPacker: ${packer}`);
            saveToGoogleSheets(asin, manufacturer, packer);
        } else {
            console.warn("⚠ ASIN, Manufacturer & Packer details not found.");
        }
    }

    function saveToGoogleSheets(asin, manufacturer, packer) {
        GM_xmlhttpRequest({
            method: "POST",
            url: GOOGLE_SHEET_URL,
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify({
                asin: asin,
                manufacturer: manufacturer,
                packer: packer
            }),
            onload: function(response) {
                console.log("📩 Response from Google Sheets:", response.responseText);
            }
        });
    }

    setTimeout(extractDetails, 8000); // ✅ Wait 8 seconds for page to fully load

})();
