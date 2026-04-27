const VERSION_REGEX = /terraform-risk-accessor@v\d+\.\d+\.\d+/g;

module.exports.readVersion = (contents) => {
  const match = contents.match(VERSION_REGEX);
  if (!match) return "0.0.0";
  return match[0].split("@v")[1];
};

module.exports.writeVersion = (contents, version) =>
  contents.replace(
    VERSION_REGEX,
    `terraform-risk-accessor@v${version}`
  );
