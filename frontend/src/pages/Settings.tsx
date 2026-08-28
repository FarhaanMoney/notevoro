import { useQuery } from "@tanstack/react-query";
import { Download, Moon, Shield, Sun, Monitor, Sparkles, Database, FolderOpen, HardDrive } from "lucide-react";
import { toast } from "sonner";
import TopBar from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkspace } from "@/lib/workspace";
import { useNewSpace } from "@/lib/newSpace";
import { exportAll, exportVaultFiles } from "@/lib/repo";
import { vault } from "@/lib/vault";
import { apiGet } from "@/lib/api";
import type { ProviderStatus } from "@/types";
import { cn } from "@/lib/utils";

const THEMES = [
  { id: "light" as const, label: "Light", icon: Sun },
  { id: "dark" as const, label: "Dark", icon: Moon },
  { id: "system" as const, label: "System", icon: Monitor },
];

export default function Settings() {
  const { user, theme, setTheme } = useWorkspace();
  const { openNewSpace } = useNewSpace();

  const provider = useQuery({
    queryKey: ["voro", "provider"],
    queryFn: () => apiGet<ProviderStatus>("/voro/provider"),
    retry: false,
  });

  const vaultInfo = useQuery({
    queryKey: ["vault", "info"],
    queryFn: async () => {
      const adapter = vault();
      const info = await adapter.info();
      const files = await exportVaultFiles();
      return { info, fileCount: Object.keys(files).length };
    },
  });

  /** Downloads the vault as real Markdown files, so the desktop app can open the folder. */
  const downloadVault = async () => {
    const files = await exportVaultFiles();
    const entries = Object.entries(files);
    if (entries.length === 0) {
      toast.error("Your vault is empty — create a task or a note first.");
      return;
    }
    // One concatenated, clearly delimited Markdown bundle: no zip dependency, and every
    // file path is preserved so it can be split back into a folder.
    const bundle = entries
      .map(([path, content]) => `<!-- notevoro:file ${path} -->\n${content}`)
      .join("\n\n");
    const url = URL.createObjectURL(new Blob([bundle], { type: "text/markdown" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `notevoro-vault-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${entries.length} vault file${entries.length === 1 ? "" : "s"}`);
  };

  const pickVault = async () => {
    const adapter = vault();
    if (!adapter.selectVault) {
      toast.error(
        "Choosing a folder needs the Notevoro desktop app — a browser cannot be given free access to your drive.",
      );
      return;
    }
    const picked = await adapter.selectVault();
    if (picked) {
      void vaultInfo.refetch();
      toast.success(`Vault set to ${picked.path}`);
    }
  };

  const download = async () => {
    const data = await exportAll(user!.id);
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `notevoro-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export downloaded");
  };

  return (
    <>
      <TopBar title="Settings" subtitle="Appearance, AI providers, data and storage" onNewSpace={openNewSpace} />
      <div className="flex-1 overflow-y-auto p-6" data-testid="settings-page">
        <div className="grid max-w-4xl gap-5">
          <section className="nv-panel animate-fade-up rounded-2xl p-5" data-testid="settings-profile">
            <h3 className="font-heading text-base font-semibold">Profile</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Name</Label>
                <Input value={user?.name ?? ""} readOnly data-testid="settings-name-input" />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Email (your messaging identifier)</Label>
                <Input value={user?.email ?? ""} readOnly data-testid="settings-email-input" />
              </div>
            </div>
          </section>

          <section className="nv-panel animate-fade-up rounded-2xl p-5" data-testid="settings-appearance">
            <h3 className="font-heading text-base font-semibold">Appearance</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Dark is Notevoro&apos;s primary identity. Light is a designed theme, not an inversion.
            </p>
            <div className="mt-4 flex gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    "nv-hover-card flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm",
                    theme === t.id && "border-primary/60 bg-primary/10",
                  )}
                  data-testid={`settings-theme-${t.id}`}
                >
                  <t.icon className="size-4" />
                  {t.label}
                </button>
              ))}
            </div>
          </section>

          <section className="nv-panel animate-fade-up rounded-2xl p-5" data-testid="settings-ai-providers">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h3 className="font-heading text-base font-semibold">AI Providers</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Notevoro is provider-agnostic: any OpenAI-compatible endpoint works (OpenAI,
              Anthropic-compatible gateways, Google Gemini gateways, aicredits.in, …). Credentials
              stay server-side and are never sent to the browser.
            </p>
            <div
              className={cn(
                "mt-4 rounded-xl border px-4 py-3 text-sm",
                provider.data?.configured
                  ? "border-primary/40 bg-primary/10"
                  : "border-border bg-secondary/40",
              )}
              data-testid="settings-provider-status"
            >
              {provider.isLoading
                ? "Checking provider…"
                : provider.data
                  ? provider.data.configured
                    ? `Connected · model ${provider.data.model}`
                    : "Not configured — Voro saves conversations but cannot answer yet."
                  : "Backend unreachable — provider status unknown."}
            </div>
            <div className="mt-4 rounded-xl border border-border bg-background/40 p-4 font-mono text-xs leading-relaxed text-muted-foreground">
              # backend/.env
              <br />
              AI_BASE_URL=https://api.aicredits.in/v1
              <br />
              AI_API_KEY=your-key
              <br />
              AI_MODEL=gpt-4o-mini
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Add those three variables, restart the backend, and Voro answers immediately.
            </p>
          </section>

          <section className="nv-panel animate-fade-up rounded-2xl p-5" data-testid="settings-vault">
            <div className="flex items-center gap-2">
              <HardDrive className="size-4 text-primary" />
              <h3 className="font-heading text-base font-semibold">Notevoro Vault</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Your data belongs to your device. Every task, event and note is a Markdown file
              with YAML frontmatter — readable and editable in Obsidian, VS Code or any editor.
              Notevoro is the interface and intelligence layer, not the owner of your data.
            </p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-border px-4 py-3" data-testid="vault-adapter-card">
                <p className="text-[11px] text-muted-foreground">Storage adapter</p>
                <p className="mt-0.5 text-sm font-medium">
                  {vaultInfo.data?.info.label ?? "Loading…"}
                </p>
                <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">
                  {vaultInfo.data?.info.path}
                </p>
              </div>
              <div className="rounded-xl border border-border px-4 py-3" data-testid="vault-stats-card">
                <p className="text-[11px] text-muted-foreground">Vault contents</p>
                <p className="mt-0.5 text-sm font-medium">
                  {vaultInfo.data?.fileCount ?? 0} Markdown file
                  {vaultInfo.data?.fileCount === 1 ? "" : "s"}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  File watching: {vaultInfo.data?.info.watching ? "active" : "desktop app only"}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={pickVault} data-testid="vault-choose-folder-button">
                <FolderOpen className="size-4" />
                Choose vault folder
              </Button>
              <Button variant="outline" size="sm" onClick={downloadVault} data-testid="vault-export-button">
                <Download className="size-4" />
                Export vault (Markdown)
              </Button>
            </div>

            {vaultInfo.data?.info.kind === "browser" && (
              <p className="mt-3 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                You are running the web preview, so the vault is held in this browser as a
                virtual filesystem — the files and paths are byte-identical to what the desktop
                app writes to disk. Real folder selection and file watching require the Tauri
                desktop build; see <span className="font-mono text-foreground">src-tauri/README.md</span>{" "}
                in the repository for the build commands.
              </p>
            )}
          </section>

          <section className="nv-panel animate-fade-up rounded-2xl p-5" data-testid="settings-data-storage">
            <div className="flex items-center gap-2">
              <Database className="size-4 text-primary" />
              <h3 className="font-heading text-base font-semibold">Data &amp; Storage</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Personal workspace data (tasks, calendar, Knowledge) lives in your vault and never
              goes to a server. Only genuinely cloud-required things are online: your account,
              Space membership, invitations, messaging and presence. Everything reaches storage
              through a repository interface, so the Tauri/Rust vault swaps in without touching
              the UI.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={download} data-testid="settings-export-button">
              <Download className="size-4" />
              Export everything (JSON)
            </Button>
          </section>

          <section className="nv-panel animate-fade-up rounded-2xl p-5" data-testid="settings-security">
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-primary" />
              <h3 className="font-heading text-base font-semibold">Security &amp; Auth</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Active auth provider: <span className="text-foreground">Supabase</span>.
              Supabase Auth is handling identity.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Space access is checked server-side on every request: a Space you are not a member of
              returns not-found, so editing the URL reveals nothing. Roles are enforced too — only an
              owner can change roles or remove members, and viewers cannot invite.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
