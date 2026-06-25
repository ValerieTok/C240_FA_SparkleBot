const pageModel = require("../models/pageModel");
const featureModel = require("../models/featureModel");

exports.showHome = (req, res) => {
  res.render("layout", {
    title: "SparkleBot",
    currentPage: "home",
    page: pageModel.getPage("home"),
    features: featureModel.getFeatures(),
    body: "pages/home"
  });
};
