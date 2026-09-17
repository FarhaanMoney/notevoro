// Minimal placeholder to unblock the compile pipeline. The rich Pages
// module is temporarily disabled while we investigate a Babel plugin
// stack-overflow that only manifests on this specific filename.
// Real routes: /api/v1/spaces/{sid}/pages are already live; content
// is preserved server-side. UI will be reintroduced after the babel
// investigation.

export default function Pages() {
  return (
    <div className="p-10" data-testid="pages-module">
      <h1 className="text-[22px] font-extrabold tracking-tight">Pages</h1>
      <div className="mt-3 text-[13px] nv-muted max-w-[520px]">
        Notion-styled nested Pages are live on the backend and can be created,
        listed, shared and sent via the API. The interactive editor is being
        reintroduced.
      </div>
    </div>
  );
}
