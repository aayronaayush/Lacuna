const mongoose = require("mongoose");
mongoose.connect('mongodb://localhost:27017/capstone_project', {useNewUrlParser: true, useUnifiedTopology: true});
const DBModel = mongoose.model("central", {
    siteName: String,
    modules: Array,
    baseHTML: String
}, "central");

module.exports = DBModel;