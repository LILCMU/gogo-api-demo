//? view-layer formatting helper — src/gogo/ stays framework-free and keeps
//? typeName/version as separate fields, since the compiler payload and other
//? consumers want them raw

//? typeName's trailing digit (the board generation, e.g. "GoGo Board 7")
//? repeats the leading digit of version (e.g. "7F"), so rendering both
//? verbatim reads as "GoGo Board 7 7M". Collapse into one non-repeating
//? string wherever both are shown.
export function boardLabel(board) {
  if (!board) return "";
  const { typeName, version } = board;
  if (!version) return typeName;

  const match = typeName.match(/^(.*\D)(\d+)$/);
  if (match && version.startsWith(match[2])) {
    return match[1] + version;
  }
  return typeName + " " + version;
}
