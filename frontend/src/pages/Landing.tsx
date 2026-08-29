import { Link } from "react-router-dom";
import { 
  Download, 
  Apple, 
  Monitor, 
  Laptop, 
  Sparkles, 
  ChevronRight,
  Check,
  Lock,
  Users,
  Brain,
  Calendar,
  FileText,
  Inbox,
  Layout,
  FolderTree,
  HardDrive,
  Cloud,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DOWNLOADS, 
  detectPlatform, 
  getRecommendedDownload, 
  areDownloadsLive,
  getAvailableDownloads
} from "@/config/downloads";

export default function Landing() {
  const platform = detectPlatform();
  const recommendedDownload = getRecommendedDownload();
  const downloadsLive = areDownloadsLive();
  const availableMacOS = getAvailableDownloads('macOS');
  const availableWindows = getAvailableDownloads('windows');
  const availableLinux = getAvailableDownloads('linux');

  const handleDownload = (url: string, isPlaceholder: boolean) => {
    if (isPlaceholder) {
      alert("Desktop apps are coming soon. Check back soon for the official Notevoro release.");
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-24 lg:px-8">
        <div
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 size-[600px] rounded-full blur-[140px]"
          style={{ background: "color-mix(in oklab, var(--primary) 20%, transparent)" }}
        />
        
        <div className="relative mx-auto max-w-7xl">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-lg bg-primary/15 text-primary">
                <Sparkles className="size-5" />
              </span>
              <span className="font-heading text-lg font-semibold">Notevoro</span>
            </div>
            <Link to="/auth">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
          </nav>

          <div className="mt-24 text-center">
            <h1 className="font-heading text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              Your knowledge. Your work. Your AI.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              A unified workspace that brings knowledge, tasks, calendar, documents, AI and collaboration together — 
              while keeping your personal workspace data local-first.
            </p>
            
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button 
                size="lg" 
                className="px-8 text-base"
                onClick={() => handleDownload(
                  recommendedDownload?.url || DOWNLOADS.macOS.primary.url,
                  recommendedDownload?.isPlaceholder || DOWNLOADS.macOS.primary.isPlaceholder
                )}
              >
                <Download className="mr-2 size-5" />
                Download Notevoro
              </Button>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="px-8 text-base">
                  Explore Notevoro
                  <ChevronRight className="ml-2 size-5" />
                </Button>
              </Link>
            </div>

            {!downloadsLive && (
              <p className="mt-4 text-sm text-muted-foreground">
                Desktop apps are coming soon — try the web version while you wait
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section className="border-y border-border bg-card/50 px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="font-heading text-3xl font-semibold sm:text-4xl">
              Download for your platform
            </h2>
            <p className="mt-4 text-muted-foreground">
              Available for macOS, Windows, and Linux
            </p>
          </div>

          {!downloadsLive ? (
            <div className="mt-12 text-center">
              <div className="nv-panel mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8">
                <Download className="mx-auto mb-4 size-12 text-muted-foreground" />
                <h3 className="font-heading text-2xl font-semibold">Desktop apps are coming soon</h3>
                <p className="mt-3 text-muted-foreground">
                  We're preparing the official Notevoro desktop applications for macOS, Windows, and Linux.
                  In the meantime, try the web version or join our GitHub repository for updates.
                </p>
                <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <Link to="/auth">
                    <Button size="lg">
                      Try the web version
                    </Button>
                  </Link>
                  <a
                    href="https://github.com/FarhaanMoney/notevoro"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex"
                  >
                    <Button size="lg" variant="outline">
                      Follow on GitHub
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {/* macOS */}
              {availableMacOS.length > 0 && (
                <div
                  className="nv-hover-card relative rounded-2xl border border-border bg-card p-6"
                >
                  {platform === 'macOS' && (
                    <div className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                      Recommended
                    </div>
                  )}
                  <Apple className="mb-4 size-8 text-muted-foreground" />
                  <h3 className="font-heading text-xl font-semibold">macOS</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Apple Silicon and Intel
                  </p>
                  <div className="mt-4 space-y-2">
                    {availableMacOS.map((download, idx) => (
                      <Button
                        key={download.name}
                        variant={idx === 0 ? "outline" : "ghost"}
                        size={idx === 0 ? "default" : "sm"}
                        className="w-full justify-start"
                        onClick={() => handleDownload(download.url, download.isPlaceholder)}
                      >
                        <Download className="mr-2 size-4" />
                        {download.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Windows */}
              {availableWindows.length > 0 && (
                <div
                  className="nv-hover-card relative rounded-2xl border border-border bg-card p-6"
                >
                  {platform === 'windows' && (
                    <div className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                      Recommended
                    </div>
                  )}
                  <Laptop className="mb-4 size-8 text-muted-foreground" />
                  <h3 className="font-heading text-xl font-semibold">Windows</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    MSI installer and setup
                  </p>
                  <div className="mt-4 space-y-2">
                    {availableWindows.map((download, idx) => (
                      <Button
                        key={download.name}
                        variant={idx === 0 ? "outline" : "ghost"}
                        size={idx === 0 ? "default" : "sm"}
                        className="w-full justify-start"
                        onClick={() => handleDownload(download.url, download.isPlaceholder)}
                      >
                        <Download className="mr-2 size-4" />
                        {download.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Linux */}
              {availableLinux.length > 0 && (
                <div
                  className="nv-hover-card relative rounded-2xl border border-border bg-card p-6"
                >
                  {platform === 'linux' && (
                    <div className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                      Recommended
                    </div>
                  )}
                  <Monitor className="mb-4 size-8 text-muted-foreground" />
                  <h3 className="font-heading text-xl font-semibold">Linux</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    AppImage and deb package
                  </p>
                  <div className="mt-4 space-y-2">
                    {availableLinux.map((download, idx) => (
                      <Button
                        key={download.name}
                        variant={idx === 0 ? "outline" : "ghost"}
                        size={idx === 0 ? "default" : "sm"}
                        className="w-full justify-start"
                        onClick={() => handleDownload(download.url, download.isPlaceholder)}
                      >
                        <Download className="mr-2 size-4" />
                        {download.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Product Overview */}
      <section className="px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="font-heading text-3xl font-semibold sm:text-4xl">
              One workspace, everything you need
            </h2>
            <p className="mt-4 text-muted-foreground">
              Notevoro brings your entire productivity workflow into one unified application
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Layout, title: "My Day", desc: "Your daily overview with tasks, calendar, and priorities" },
              { icon: FileText, title: "Knowledge", desc: "A markdown-based knowledge base that grows with you" },
              { icon: Check, title: "Tasks", desc: "Task management with projects, tags, and due dates" },
              { icon: Calendar, title: "Calendar", desc: "Integrated calendar for events and deadlines" },
              { icon: Brain, title: "Voro AI", desc: "AI assistant that understands your workspace context" },
              { icon: Inbox, title: "Inbox", desc: "Quick capture for ideas, tasks, and references" },
            ].map((feature) => (
              <div
                key={feature.title}
                className="nv-hover-card rounded-2xl border border-border bg-card p-6"
              >
                <feature.icon className="mb-4 size-6 text-primary" />
                <h3 className="font-heading text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Unified Spaces */}
      <section className="border-y border-border bg-card/50 px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="font-heading text-3xl font-semibold sm:text-4xl">
              Spaces for every workflow
            </h2>
            <p className="mt-4 text-muted-foreground">
              Different workflows, one application. Create Spaces for each area of your life.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2">
            {[
              {
                title: "Student",
                desc: "Organize courses, assignments, lecture notes, and study schedules in one place",
                items: ["Course notes", "Assignment tracking", "Study calendar", "Research knowledge base"]
              },
              {
                title: "Educator",
                desc: "Manage lesson plans, student resources, grading, and administrative tasks",
                items: ["Lesson planning", "Resource library", "Grade tracking", "Meeting notes"]
              },
              {
                title: "Professional",
                desc: "Handle projects, clients, documentation, and business operations",
                items: ["Project management", "Client documentation", "Meeting notes", "Task tracking"]
              },
              {
                title: "Personal",
                desc: "Your life outside work — hobbies, health, finances, and personal projects",
                items: ["Personal goals", "Health tracking", "Financial planning", "Creative projects"]
              },
            ].map((space) => (
              <div
                key={space.title}
                className="nv-hover-card rounded-2xl border border-border bg-card p-8"
              >
                <h3 className="font-heading text-2xl font-semibold">{space.title}</h3>
                <p className="mt-3 text-muted-foreground">{space.desc}</p>
                <ul className="mt-6 space-y-3">
                  {space.items.map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm">
                      <Check className="size-4 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Local-First Architecture */}
      <section className="px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-heading text-3xl font-semibold sm:text-4xl">
                Your data belongs to you
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Notevoro is built local-first. Your personal workspace data stays on your device,
                in your Notevoro Vault — a collection of Markdown files you own.
              </p>
              
              <div className="mt-8 space-y-6">
                <div className="flex gap-4">
                  <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10">
                    <HardDrive className="size-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold">Local Markdown Vault</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Your knowledge, tasks, calendar, documents, and personal Voro conversations 
                      are stored as Markdown files on your computer
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10">
                    <Shield className="size-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold">No Vendor Lock-in</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Your data is in plain Markdown. You can access it with any text editor, 
                      version control it with Git, or migrate it anywhere
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10">
                    <Lock className="size-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold">Privacy by Design</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Personal workspace data never leaves your device unless you choose to share it
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="nv-panel rounded-2xl border border-border bg-card p-8">
              <h3 className="font-heading text-lg font-semibold mb-6">Architecture</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg bg-background p-4">
                  <span className="font-heading font-semibold">Notevoro</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-background p-4">
                  <span className="font-heading font-semibold">Tauri 2</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-background p-4">
                  <span className="font-heading font-semibold">Notevoro Vault</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-primary/10 p-4">
                  <FolderTree className="size-5 text-primary" />
                  <div>
                    <div className="font-medium">Markdown files</div>
                    <div className="text-xs text-muted-foreground">Your data in plain text</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-primary/10 p-4">
                  <HardDrive className="size-5 text-primary" />
                  <div>
                    <div className="font-medium">SQLite index</div>
                    <div className="text-xs text-muted-foreground">Fast search and queries</div>
                  </div>
                </div>
              </div>
              
              <p className="mt-6 text-xs text-muted-foreground">
                Supabase handles authentication and identity. Genuinely collaborative features 
                can use cloud infrastructure for multi-user Spaces.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Collaboration */}
      <section className="border-y border-border bg-card/50 px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="font-heading text-3xl font-semibold sm:text-4xl">
              Collaborate when you need to
            </h2>
            <p className="mt-4 text-muted-foreground">
              Personal data stays local. Team collaboration uses cloud infrastructure so you can actually work together.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2">
            <div className="nv-hover-card rounded-2xl border border-border bg-card p-8">
              <Users className="mb-4 size-8 text-primary" />
              <h3 className="font-heading text-2xl font-semibold">Team Spaces</h3>
              <p className="mt-3 text-muted-foreground">
                Create shared Spaces for projects, teams, or organizations. Invite members and 
                collaborate on tasks, documents, and knowledge.
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                Collaborative Spaces use cloud infrastructure so teammates can access shared data in real-time.
              </p>
            </div>

            <div className="nv-hover-card rounded-2xl border border-border bg-card p-8">
              <Cloud className="mb-4 size-8 text-primary" />
              <h3 className="font-heading text-2xl font-semibold">Cloud When Needed</h3>
              <p className="mt-3 text-muted-foreground">
                Authentication via Supabase provides secure identity. Genuinely collaborative 
                features use cloud services to enable real-time sharing.
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                Your personal workspace data remains local — only data you explicitly share is stored in the cloud.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Voro AI */}
      <section className="px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="font-heading text-3xl font-semibold sm:text-4xl">
              Voro: Your AI workspace assistant
            </h2>
            <p className="mt-4 text-muted-foreground">
              An AI layer that understands your workspace context and helps you work smarter
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <div className="nv-hover-card rounded-2xl border border-border bg-card p-6">
              <Brain className="mb-4 size-6 text-primary" />
              <h3 className="font-heading text-lg font-semibold">Context-Aware</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Voro understands your Spaces, tasks, and knowledge to provide relevant assistance
              </p>
            </div>

            <div className="nv-hover-card rounded-2xl border border-border bg-card p-6">
              <Shield className="mb-4 size-6 text-primary" />
              <h3 className="font-heading text-lg font-semibold">User-Controlled</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Bring your own AI providers and API keys. You control which AI services power your workspace
              </p>
            </div>

            <div className="nv-hover-card rounded-2xl border border-border bg-card p-6">
              <Sparkles className="mb-4 size-6 text-primary" />
              <h3 className="font-heading text-lg font-semibold">Integrated</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Voro works across My Day, Knowledge, Tasks, and Spaces — one assistant for your entire workflow
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-y border-border bg-card/50 px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-4xl font-semibold sm:text-5xl">
            Build your workspace. Keep your data yours.
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            {downloadsLive 
              ? "Download Notevoro and create your first Space. Your knowledge, tasks, and calendar stay on your device — you own your workflow."
              : "Your knowledge, tasks, and calendar stay on your device — you own your workflow. Try the web version while we prepare the desktop apps."
            }
          </p>
          
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            {downloadsLive ? (
              <Button 
                size="lg" 
                className="px-8 text-base"
                onClick={() => handleDownload(
                  recommendedDownload?.url || DOWNLOADS.macOS.primary.url,
                  recommendedDownload?.isPlaceholder || DOWNLOADS.macOS.primary.isPlaceholder
                )}
              >
                <Download className="mr-2 size-5" />
                Download Notevoro
              </Button>
            ) : (
              <Button 
                size="lg" 
                className="px-8 text-base"
                onClick={() => handleDownload(
                  DOWNLOADS.macOS.primary.url,
                  DOWNLOADS.macOS.primary.isPlaceholder
                )}
              >
                <Download className="mr-2 size-5" />
                Get notified when ready
              </Button>
            )}
            <Link to="/auth">
              <Button size="lg" variant="outline" className="px-8 text-base">
                Get started in browser
              </Button>
            </Link>
          </div>

          {!downloadsLive && (
            <p className="mt-4 text-sm text-muted-foreground">
              Desktop apps are coming soon — follow our GitHub for updates
            </p>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary">
                <Sparkles className="size-4" />
              </span>
              <span className="font-heading font-semibold">Notevoro</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Notevoro. Local-first productivity workspace.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="https://github.com/FarhaanMoney/notevoro" className="hover:text-foreground transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
