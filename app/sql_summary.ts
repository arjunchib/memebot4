const whitespace = /[\s;]+/g;
const borderChars = /([;()])/g;

export function summarizeSql(sql: string) {
  var tokens = tokenize(sql);
  return stripTokens(tokens).join(" ");
}

function stripTokens(tokens: string[]) {
  var verb = tokens[0]?.toUpperCase();
  return [verb].concat(afterVerb(tokens)).filter(function (token) {
    return !!token;
  });
}

function afterVerb(tokens: string[]) {
  switch (tokens[0]?.toUpperCase()) {
    case "SELECT":
      return afterToken("FROM", tokens);
    case "INSERT":
      return afterToken("INTO", tokens);
    case "UPDATE":
      return tokens[1];
    case "DELETE":
      return afterToken("FROM", tokens);
    case "CREATE":
      return afterToken(["DATABASE", "TABLE", "INDEX"], tokens);
    case "DROP":
      return afterToken(["DATABASE", "TABLE"], tokens);
    case "ALTER":
      return afterToken("TABLE", tokens);
    case "DESC":
      return tokens[1];
    case "TRUNCATE":
      return afterToken("TABLE", tokens);
    case "USE":
      return tokens[1];
  }
}

function afterToken(find: string | string[], tokens: string[]) {
  let index;

  if (!Array.isArray(find)) find = [find];
  find = find.map(function (find) {
    return find.toUpperCase();
  });

  for (let n = 0, l = tokens.length - 1; n < l; n++) {
    const token = tokens[n]?.toUpperCase();
    index = token ? find.indexOf(token) : -1;
    if (index !== -1) return [find[index], tokens[n + 1]];
  }
}

function tokenize(sql: string) {
  return normalize(sql).split(" ");
}

function normalize(sql: string) {
  return sql.replace(borderChars, " $1 ").replace(whitespace, " ").trim();
}
