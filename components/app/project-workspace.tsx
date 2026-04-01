/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Download, Filter, Play, Plus, Share2, Sparkles, SquarePen, Upload } from "lucide-react";
import { generateMarkdown } from "@/lib/export";
import {
  ELEMENT_COLORS,
  SCREEN_FILTERS,
  type Connection,
  type ConnectionAction,
  type Hotspot,
  type NormalizedBounds,
  type Project,
  type ProjectImport,
  type Screen,
  type ScreenFilter,
  type TransitionType,
} from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";
import { ScreenCanvas } from "@/components/editor/screen-canvas";

interface WorkspaceProps {
  initialProject: Project;
  readOnly?: boolean;
  importHistory?: ProjectImport[];
}

function groupedScreens(screens: Screen[]) {
  return screens.reduce<Map<string, { label: string; screens: Screen[] }>>((groups, screen) => {
    const label = screen.subcategory ? `${screen.category} / ${screen.subcategory}` : screen.category;
    const key = `${screen.category}::${screen.subcategory ?? ""}`;
    const group = groups.get(key) ?? { label, screens: [] };
    group.screens.push(screen);
    groups.set(key, group);
    return groups;
  }, new Map());
}

function matchesFilter(project: Project, screen: Screen, filter: ScreenFilter) {
  if (filter === "all") {
    return true;
  }

  if (filter === "start") {
    return screen.isStartScreen;
  }

  if (filter === "manual") {
    return screen.sourceType === "manual";
  }

  if (filter === "no-hotspots") {
    return screen.hotspots.length === 0;
  }

  if (filter === "changed-since-last-sync") {
    return screen.changedSinceLastSync;
  }

  const inbound = project.connections.some((connection) => connection.targetScreenId === screen.id);
  const outbound = project.connections.some((connection) => connection.sourceScreenId === screen.id);

  if (filter === "dead-end") {
    return !outbound;
  }

  if (filter === "unlinked") {
    return !inbound && !outbound;
  }

  return true;
}

function makeHotspot(screenId: string, geometry: NormalizedBounds): Hotspot {
  return {
    id: `hotspot_${crypto.randomUUID().replace(/-/g, "")}`,
    screenId,
    label: "New hotspot",
    elementType: "button",
    rawName: "manual-button-new-hotspot",
    sourceType: "manual",
    editable: true,
    geometry,
  };
}

function makeConnection(hotspotId: string, screenId: string): Connection {
  return {
    id: `connection_${crypto.randomUUID().replace(/-/g, "")}`,
    sourceHotspotId: hotspotId,
    sourceScreenId: screenId,
    action: "navigate",
    transition: "push",
  };
}

function getScreenConnections(project: Project, screenId: string) {
  return project.connections.filter(
    (connection) => connection.sourceScreenId === screenId || connection.targetScreenId === screenId,
  );
}

function ProjectPlayer({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const startScreen = project.screens.find((screen) => screen.isStartScreen) ?? project.screens[0];
  const [currentScreenId, setCurrentScreenId] = useState(startScreen?.id ?? null);
  const [overlayScreenId, setOverlayScreenId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  if (!currentScreenId) {
    return null;
  }

  const currentScreen = project.screens.find((screen) => screen.id === currentScreenId);
  if (!currentScreen) {
    return null;
  }

  const overlayScreen = overlayScreenId
    ? project.screens.find((screen) => screen.id === overlayScreenId) ?? null
    : null;

  const activate = (hotspot: Hotspot) => {
    const connection = project.connections.find(
      (candidate) => candidate.sourceHotspotId === hotspot.id,
    );

    if (!connection) {
      return;
    }

    if (connection.action === "open_url" && connection.targetUrl) {
      window.open(connection.targetUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (connection.action === "back") {
      if (overlayScreenId) {
        setOverlayScreenId(null);
        return;
      }

      setHistory((previous) => {
        const nextHistory = [...previous];
        const last = nextHistory.pop();
        if (last) {
          setCurrentScreenId(last);
        }
        return nextHistory;
      });
      return;
    }

    if (!connection.targetScreenId) {
      return;
    }

    if (connection.action === "open_overlay") {
      setOverlayScreenId(connection.targetScreenId);
      return;
    }

    setHistory((previous) => [...previous, currentScreen.id]);
    setCurrentScreenId(connection.targetScreenId);
    setOverlayScreenId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">Prototype player</p>
          <h3 className="text-lg font-semibold text-white">{currentScreen.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (overlayScreenId) {
                setOverlayScreenId(null);
                return;
              }
              setHistory((previous) => {
                const nextHistory = [...previous];
                const last = nextHistory.pop();
                if (last) {
                  setCurrentScreenId(last);
                }
                return nextHistory;
              });
            }}
            disabled={history.length === 0 && !overlayScreenId}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/20 hover:text-white"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-300"
          >
            Close
          </button>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-auto p-8">
        <div className="relative w-full max-w-sm">
          <ScreenCanvas
            screen={currentScreen}
            hotspots={currentScreen.hotspots.filter((hotspot) =>
              project.connections.some((connection) => connection.sourceHotspotId === hotspot.id),
            )}
            selectedHotspotId={null}
            interactive
            showLabels={false}
            onActivateHotspot={activate}
          />

          {overlayScreen ? (
            <div className="absolute inset-x-6 top-16 rounded-[1.5rem] border border-white/15 bg-slate-950/95 p-3 shadow-2xl">
              <div className="mb-3 flex items-center justify-between px-2">
                <p className="text-sm font-medium text-white">{overlayScreen.name}</p>
                <button
                  type="button"
                  onClick={() => setOverlayScreenId(null)}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 transition hover:border-white/20 hover:text-white"
                >
                  Dismiss
                </button>
              </div>
              <ScreenCanvas
                screen={overlayScreen}
                hotspots={overlayScreen.hotspots.filter((hotspot) =>
                  project.connections.some((connection) => connection.sourceHotspotId === hotspot.id),
                )}
                selectedHotspotId={null}
                interactive
                showLabels={false}
                onActivateHotspot={activate}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ProjectWorkspace({
  initialProject,
  readOnly = false,
  importHistory = [],
}: WorkspaceProps) {
  const [project, setProject] = useState(initialProject);
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(
    initialProject.viewState.selectedScreenId ?? initialProject.screens[0]?.id ?? null,
  );
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ScreenFilter>(initialProject.viewState.activeFilter);
  const [searchQuery, setSearchQuery] = useState(initialProject.viewState.searchQuery);
  const [drawMode, setDrawMode] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const didMountRef = useRef(false);
  const deferredQuery = useDeferredValue(searchQuery);

  const selectedScreen =
    project.screens.find((screen) => screen.id === selectedScreenId) ?? project.screens[0] ?? null;
  const selectedHotspot =
    selectedScreen?.hotspots.find((hotspot) => hotspot.id === selectedHotspotId) ?? null;
  const selectedConnection =
    selectedHotspot
      ? project.connections.find((connection) => connection.sourceHotspotId === selectedHotspot.id) ?? null
      : null;

  const filteredScreens = useMemo(() => {
    const query = deferredQuery.trim().toLowerCase();
    return project.screens.filter((screen) => {
      if (!matchesFilter(project, screen, activeFilter)) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        screen.name,
        screen.category,
        screen.subcategory ?? "",
        screen.tags.join(" "),
        ...screen.hotspots.map((hotspot) => hotspot.label),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [activeFilter, deferredQuery, project]);

  const grouped = useMemo(() => groupedScreens(filteredScreens), [filteredScreens]);

  const persistProject = useCallback(
    (nextProject: Project) => {
      if (readOnly) {
        return;
      }

      startTransition(async () => {
        setErrorMessage(null);
        const response = await fetch("/api/editor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save-project",
            project: nextProject,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          setErrorMessage(payload?.error ?? "Could not save the latest changes.");
        }
      });
    },
    [readOnly],
  );

  const mutateProject = (mutator: (draft: Project) => void) => {
    const nextProject = structuredClone(project);
    mutator(nextProject);
    nextProject.viewState = {
      selectedScreenId,
      activeFilter,
      searchQuery,
    };
    nextProject.updatedAt = new Date().toISOString();
    setProject(nextProject);
    persistProject(nextProject);
  };

  useEffect(() => {
    if (readOnly) {
      return;
    }

    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    const timeout = window.setTimeout(() => {
      const nextProject = structuredClone(project);
      nextProject.viewState = {
        selectedScreenId,
        activeFilter,
        searchQuery,
      };
      setProject(nextProject);
      persistProject(nextProject);
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [activeFilter, persistProject, project, readOnly, searchQuery, selectedScreenId]);

  return (
    <>
      <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-6 p-6">
        <div className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 shadow-xl shadow-slate-950/30 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">
              {project.sourceMode} project
            </p>
            <h1 className="text-3xl font-semibold text-white">{project.name}</h1>
            <p className="max-w-3xl text-sm leading-6 text-white/60">{project.description}</p>
            <div className="flex flex-wrap gap-3 text-xs text-white/45">
              <span>{project.screens.length} screens</span>
              <span>{project.connections.length} flows</span>
              <span>Updated {formatDateTime(project.updatedAt)}</span>
              <span>Sync {project.syncStatus}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setPlayerOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              <Play className="h-4 w-4" />
              Play prototype
            </button>
            {!readOnly ? (
              <button
                type="button"
                onClick={() => {
                  const markdown = generateMarkdown(project);
                  void navigator.clipboard.writeText(markdown);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                <Download className="h-4 w-4" />
                Copy export
              </button>
            ) : null}
            {!readOnly ? (
              <button
                type="button"
                onClick={() => {
                  startTransition(async () => {
                    const response = await fetch("/api/editor", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "create-share-link",
                        projectId: project.id,
                      }),
                    });
                    const payload = (await response.json()) as { shareLink?: { token: string } };
                    if (payload.shareLink) {
                      setShareUrl(`${window.location.origin}/share/${payload.shareLink.token}`);
                    }
                  });
                }}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                <Share2 className="h-4 w-4" />
                Create share link
              </button>
            ) : null}
          </div>
        </div>

        {shareUrl ? (
          <div className="rounded-[1.5rem] border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-100">
            Share link ready:
            {" "}
            <a className="underline underline-offset-4" href={shareUrl} target="_blank" rel="noreferrer">
              {shareUrl}
            </a>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-[1.5rem] border border-rose-400/20 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_1.4fr_0.95fr]">
          <section className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-5">
            <div className="mb-4 flex items-center gap-3">
              <Filter className="h-4 w-4 text-cyan-300" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search screens, tags, actions..."
                className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none transition focus:border-cyan-400/50"
              />
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {SCREEN_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs capitalize transition",
                    activeFilter === filter
                      ? "bg-white text-slate-950"
                      : "border border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white",
                  )}
                >
                  {filter.replaceAll("-", " ")}
                </button>
              ))}
            </div>

            <div className="space-y-5">
              {Array.from(grouped.entries()).map(([key, group]) => (
                <div key={key} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white">{group.label}</h2>
                    <span className="text-xs text-white/40">{group.screens.length}</span>
                  </div>
                  <div className="grid gap-3">
                    {group.screens.map((screen) => {
                      const relatedConnections = getScreenConnections(project, screen.id);
                      return (
                        <button
                          key={screen.id}
                          type="button"
                          onClick={() => {
                            setSelectedScreenId(screen.id);
                            setSelectedHotspotId(null);
                          }}
                          className={cn(
                            "overflow-hidden rounded-[1.5rem] border text-left transition",
                            selectedScreenId === screen.id
                              ? "border-cyan-400/50 bg-cyan-400/10"
                              : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]",
                          )}
                        >
                          <div className="aspect-[10/13] w-full overflow-hidden border-b border-white/10 bg-slate-900">
                            <img
                              src={screen.imageUrl}
                              alt={screen.name}
                              className="h-full w-full object-cover object-top"
                            />
                          </div>
                          <div className="space-y-2 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="text-sm font-semibold text-white">{screen.name}</h3>
                                <p className="text-xs text-white/45">
                                  {screen.subcategory ? `${screen.category} / ${screen.subcategory}` : screen.category}
                                </p>
                              </div>
                              {screen.isStartScreen ? (
                                <span className="rounded-full bg-amber-300 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-950">
                                  Start
                                </span>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {screen.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/55"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center justify-between text-xs text-white/45">
                              <span>{screen.hotspots.length} hotspots</span>
                              <span>{relatedConnections.length} linked</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-5 rounded-[2rem] border border-white/10 bg-slate-950/70 p-5">
            {selectedScreen ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">
                      {selectedScreen.sourceType} screen
                    </p>
                    <h2 className="text-2xl font-semibold text-white">{selectedScreen.name}</h2>
                    <p className="text-sm text-white/50">
                      {selectedScreen.subcategory
                        ? `${selectedScreen.category} / ${selectedScreen.subcategory}`
                        : selectedScreen.category}
                    </p>
                  </div>

                  {!readOnly ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          mutateProject((draft) => {
                            draft.screens.forEach((screen) => {
                              screen.isStartScreen = screen.id === selectedScreen.id;
                            });
                          })
                        }
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:border-white/20 hover:text-white"
                      >
                        Set as start
                      </button>
                      <button
                        type="button"
                        onClick={() => setDrawMode((value) => !value)}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition",
                          drawMode
                            ? "bg-cyan-400 text-slate-950"
                            : "border border-white/10 bg-white/5 text-white/75 hover:border-white/20 hover:text-white",
                        )}
                      >
                        <SquarePen className="h-4 w-4" />
                        {drawMode ? "Drawing hotspot" : "Draw hotspot"}
                      </button>
                    </div>
                  ) : null}
                </div>

                <ScreenCanvas
                  screen={selectedScreen}
                  hotspots={selectedScreen.hotspots}
                  selectedHotspotId={selectedHotspotId}
                  drawMode={drawMode}
                  interactive={!readOnly}
                  onSelectHotspot={(hotspotId) => setSelectedHotspotId(hotspotId)}
                  onCreateHotspot={(geometry) => {
                    if (readOnly || !selectedScreen) {
                      return;
                    }

                    const newHotspot = makeHotspot(selectedScreen.id, geometry);
                    mutateProject((draft) => {
                      const screen = draft.screens.find((candidate) => candidate.id === selectedScreen.id);
                      if (!screen) {
                        return;
                      }
                      screen.hotspots.push(newHotspot);
                      draft.viewState.selectedScreenId = screen.id;
                    });
                    setSelectedHotspotId(newHotspot.id);
                    setDrawMode(false);
                  }}
                />

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-white/45">Tags</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedScreen.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan-100"
                        >
                          <Sparkles className="h-3 w-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-white/45">Connections</p>
                    <div className="mt-3 space-y-2 text-sm text-white/65">
                      {getScreenConnections(project, selectedScreen.id).length > 0 ? (
                        getScreenConnections(project, selectedScreen.id).map((connection) => {
                          const target = connection.targetScreenId
                            ? project.screens.find((screen) => screen.id === connection.targetScreenId)
                            : null;
                          return (
                            <div
                              key={connection.id}
                              className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2"
                            >
                              {connection.action}{" "}
                              {target ? `-> ${target.name}` : connection.targetUrl ? `-> ${connection.targetUrl}` : ""}
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-white/45">No flows attached yet.</p>
                      )}
                    </div>
                  </div>
                </div>

                {!readOnly ? (
                  <form
                    className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.02] p-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (!selectedScreen) {
                        return;
                      }

                      const formElement = event.currentTarget;
                      const formData = new FormData(formElement);
                      const fileInput = formElement.elements.namedItem("file");
                      if (!(fileInput instanceof HTMLInputElement) || !fileInput.files?.length) {
                        return;
                      }

                      formData.set("action", "add-manual-screen");
                      formData.set("projectId", project.id);

                      startTransition(async () => {
                        const response = await fetch("/api/editor", {
                          method: "POST",
                          body: formData,
                        });
                        const payload = (await response.json()) as { project?: Project; error?: string };
                        if (payload.project) {
                          setProject(payload.project);
                          setSelectedScreenId(payload.project.screens.at(-1)?.id ?? null);
                          setSelectedHotspotId(null);
                          formElement.reset();
                        } else if (payload.error) {
                          setErrorMessage(payload.error);
                        }
                      });
                    }}
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <Upload className="h-4 w-4 text-cyan-300" />
                      <p className="text-sm font-medium text-white">Add a manual screen</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        name="name"
                        type="text"
                        placeholder="Screen name"
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
                      />
                      <input
                        name="category"
                        type="text"
                        placeholder="Category"
                        defaultValue={selectedScreen.category}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
                      />
                      <input
                        name="subcategory"
                        type="text"
                        placeholder="Subcategory"
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
                      />
                      <input
                        name="file"
                        type="file"
                        accept="image/*"
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-cyan-400 file:px-3 file:py-2 file:text-slate-950"
                      />
                    </div>
                    <button
                      type="submit"
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-300"
                    >
                      <Plus className="h-4 w-4" />
                      Add screen
                    </button>
                  </form>
                ) : null}

                {!readOnly && importHistory.length > 0 ? (
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-white/45">Import history</p>
                    <div className="mt-3 space-y-2">
                      {importHistory.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white/65"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span>{entry.sourceLabel}</span>
                            <span className="capitalize text-white/45">{entry.status}</span>
                          </div>
                          <p className="mt-1 text-xs text-white/35">
                            {formatDateTime(entry.createdAt)}
                            {entry.error ? ` • ${entry.error}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex min-h-[50vh] items-center justify-center rounded-[2rem] border border-dashed border-white/10 text-white/40">
                No screen selected yet.
              </div>
            )}
          </section>

          <aside className="space-y-5 rounded-[2rem] border border-white/10 bg-slate-950/70 p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">Inspector</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {selectedHotspot ? selectedHotspot.label : "Select a hotspot"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/50">
                {selectedHotspot
                  ? "Tune the hotspot type, target, and transition here."
                  : "Pick a screen hotspot or draw a new one to define the flow behavior."}
              </p>
            </div>

            {selectedScreen ? (
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-white/45">Hotspots</p>
                <div className="mt-3 space-y-2">
                  {selectedScreen.hotspots.length > 0 ? (
                    selectedScreen.hotspots.map((hotspot) => (
                      <button
                        key={hotspot.id}
                        type="button"
                        onClick={() => setSelectedHotspotId(hotspot.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition",
                          selectedHotspotId === hotspot.id
                            ? "border-cyan-400/50 bg-cyan-400/10"
                            : "border-white/10 bg-slate-950/60 hover:border-white/20",
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{hotspot.label}</p>
                          <p className="text-xs text-white/45">{hotspot.elementType}</p>
                        </div>
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: ELEMENT_COLORS[hotspot.elementType] }}
                        />
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-white/45">No hotspots yet.</p>
                  )}
                </div>
              </div>
            ) : null}

            {selectedHotspot && selectedScreen && !readOnly ? (
              <div className="space-y-4 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                <label className="block space-y-2 text-sm text-white/70">
                  <span>Label</span>
                  <input
                    type="text"
                    value={selectedHotspot.label}
                    onChange={(event) =>
                      mutateProject((draft) => {
                        const screen = draft.screens.find((candidate) => candidate.id === selectedScreen.id);
                        const hotspot = screen?.hotspots.find((candidate) => candidate.id === selectedHotspot.id);
                        if (hotspot) {
                          hotspot.label = event.target.value;
                        }
                      })
                    }
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
                  />
                </label>

                <label className="block space-y-2 text-sm text-white/70">
                  <span>Element type</span>
                  <select
                    value={selectedHotspot.elementType}
                    onChange={(event) =>
                      mutateProject((draft) => {
                        const screen = draft.screens.find((candidate) => candidate.id === selectedScreen.id);
                        const hotspot = screen?.hotspots.find((candidate) => candidate.id === selectedHotspot.id);
                        if (hotspot) {
                          hotspot.elementType = event.target.value as Hotspot["elementType"];
                        }
                      })
                    }
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
                  >
                    {Object.keys(ELEMENT_COLORS).map((elementType) => (
                      <option key={elementType} value={elementType}>
                        {elementType}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2 text-sm text-white/70">
                  <span>Action</span>
                  <select
                    value={selectedConnection?.action ?? "navigate"}
                    onChange={(event) =>
                      mutateProject((draft) => {
                        const existing =
                          draft.connections.find(
                            (connection) => connection.sourceHotspotId === selectedHotspot.id,
                          ) ?? null;

                        if (!existing) {
                          const connection = makeConnection(selectedHotspot.id, selectedScreen.id);
                          connection.action = event.target.value as ConnectionAction;
                          draft.connections.push(connection);
                          return;
                        }

                        existing.action = event.target.value as ConnectionAction;
                        if (existing.action === "back") {
                          delete existing.targetScreenId;
                          delete existing.targetUrl;
                        }
                      })
                    }
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
                  >
                    <option value="navigate">navigate</option>
                    <option value="open_overlay">open_overlay</option>
                    <option value="back">back</option>
                    <option value="open_url">open_url</option>
                  </select>
                </label>

                {(selectedConnection?.action ?? "navigate") !== "back" &&
                (selectedConnection?.action ?? "navigate") !== "open_url" ? (
                  <label className="block space-y-2 text-sm text-white/70">
                    <span>Target screen</span>
                    <select
                      value={selectedConnection?.targetScreenId ?? ""}
                      onChange={(event) =>
                        mutateProject((draft) => {
                          const connection =
                            draft.connections.find(
                              (candidate) => candidate.sourceHotspotId === selectedHotspot.id,
                            ) ?? null;
                          if (connection) {
                            connection.targetScreenId = event.target.value;
                          }
                        })
                      }
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
                    >
                      <option value="">Choose a screen</option>
                      {project.screens
                        .filter((screen) => screen.id !== selectedScreen.id)
                        .map((screen) => (
                          <option key={screen.id} value={screen.id}>
                            {screen.name}
                          </option>
                        ))}
                    </select>
                  </label>
                ) : null}

                {(selectedConnection?.action ?? "navigate") === "open_url" ? (
                  <label className="block space-y-2 text-sm text-white/70">
                    <span>Target URL</span>
                    <input
                      type="url"
                      value={selectedConnection?.targetUrl ?? ""}
                      onChange={(event) =>
                        mutateProject((draft) => {
                          const connection =
                            draft.connections.find(
                              (candidate) => candidate.sourceHotspotId === selectedHotspot.id,
                            ) ?? null;
                          if (connection) {
                            connection.targetUrl = event.target.value;
                          }
                        })
                      }
                      placeholder="https://..."
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
                    />
                  </label>
                ) : null}

                <label className="block space-y-2 text-sm text-white/70">
                  <span>Transition</span>
                  <select
                    value={selectedConnection?.transition ?? "push"}
                    onChange={(event) =>
                      mutateProject((draft) => {
                        const connection =
                          draft.connections.find(
                            (candidate) => candidate.sourceHotspotId === selectedHotspot.id,
                          ) ?? null;
                        if (connection) {
                          connection.transition = event.target.value as TransitionType;
                        }
                      })
                    }
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
                  >
                    <option value="push">push</option>
                    <option value="fade">fade</option>
                    <option value="slide-left">slide-left</option>
                    <option value="slide-right">slide-right</option>
                    <option value="slide-up">slide-up</option>
                    <option value="none">none</option>
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedHotspotId(null)}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/20 hover:text-white"
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      mutateProject((draft) => {
                        const screen = draft.screens.find((candidate) => candidate.id === selectedScreen.id);
                        if (!screen) {
                          return;
                        }
                        screen.hotspots = screen.hotspots.filter(
                          (candidate) => candidate.id !== selectedHotspot.id,
                        );
                        draft.connections = draft.connections.filter(
                          (candidate) => candidate.sourceHotspotId !== selectedHotspot.id,
                        );
                      })
                    }
                    className="rounded-full border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm text-rose-100 transition hover:bg-rose-400/20"
                  >
                    Delete hotspot
                  </button>
                </div>
              </div>
            ) : null}

            {!selectedHotspot ? (
              <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm leading-6 text-white/45">
                FlowLens groups screens by page and section, keeps search and filters nearby, and lets
                you draw manual hotspots when the source file is missing structure. That makes review
                easier for designers and for anyone sharing flows without opening Figma.
              </div>
            ) : null}

            {isPending ? (
              <div className="rounded-[1.5rem] border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
                Saving your latest changes...
              </div>
            ) : null}
          </aside>
        </div>
      </div>

      {playerOpen ? (
        <ProjectPlayer key={`${project.id}-${project.updatedAt}`} project={project} onClose={() => setPlayerOpen(false)} />
      ) : null}
    </>
  );
}
