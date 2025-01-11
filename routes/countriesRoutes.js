const express = require("express");
const router = express.Router();
const countries = require("../data/countries.json");

router.get("/countries", (req, res) => {
    res.status(200).json(countries);
});

module.exports = router;
