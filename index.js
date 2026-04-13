const app = require("./app");
const config = require("./config/env");

app.listen(config.port, "0.0.0.0", () => {
  console.log(`Server running in ${config.env} mode on port ${config.port}`);
});
