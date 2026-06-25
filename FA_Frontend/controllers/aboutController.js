const pageModel = require("../models/pageModel");
const toolModel = require("../models/toolModel");

exports.showAbout = (req, res) => {
  res.render("layout", {
    title: "About AI",
    currentPage: "about",
    page: pageModel.getPage("about"),
    tools: toolModel.getTools(),
    structures: toolModel.getAiStructures(),
    body: "pages/about"
  });
};
