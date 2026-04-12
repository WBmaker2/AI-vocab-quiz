export function getTeacherProfilePanelMode(profileEditorOpen) {
  return profileEditorOpen ? "expanded" : "collapsed";
}

export function buildTeacherWorkspaceSummaryChips({ total, withExamples, published }) {
  return [
    { id: "total", label: `등록 ${total}개` },
    { id: "examples", label: `예문 ${withExamples}개` },
    { id: "published", label: `공개 ${published ? "ON" : "OFF"}` },
  ];
}
