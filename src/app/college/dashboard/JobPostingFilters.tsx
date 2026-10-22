"use client";

import { useMemo, useState } from "react";
import EmptyState from "@/components/EmptyState";
import FadeInStagger from "@/components/reactbits/FadeInStagger";
import Icon from "@/components/Icon";
import type { Posting } from "@/lib/types";
import ExpandablePostingCard from "./ExpandablePostingCard";

type PostingWithCompany = Posting & { companies: { name: string } | null };
type InterestSummary = { interested_count: number; eligible_count: number };

const branchOptions = [
  { label: "Hotel Management", matches: ["hotel management"] },
  { label: "ITI", matches: ["iti"] },
  { label: "Data Science", matches: ["data science"] },
  { label: "Mechanical", matches: ["mechanical"] },
  { label: "Civil", matches: ["civil"] },
  { label: "Automobile", matches: ["automobile", "automotive"] },
  { label: "Engineering / Manufacturing", matches: ["engineering", "manufacturing"] },
  {
    label: "Computer Engineering / IT",
    matches: ["computer engineering", "computer science", "information technology", "cse"],
  },
  {
    label: "AI & Data Science / AI & ML",
    matches: ["ai & data science", "ai & ml", "artificial intelligence", "machine learning"],
  },
  { label: "Electronics / EXTC", matches: ["electronics", "extc", "ece"] },
  { label: "Electrical / Instrumentation", matches: ["electrical", "instrumentation", "eee"] },
  { label: "Chemical / Production Engineering", matches: ["chemical", "production engineering"] },
  { label: "Management / Commerce", matches: ["management", "commerce", "mba", "bba"] },
] as const;

export default function JobPostingFilters({
  postings,
  interestByPosting,
}: {
  postings: PostingWithCompany[];
  interestByPosting: Record<string, InterestSummary>;
}) {
  const [search, setSearch] = useState("");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  const filteredPostings = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return postings.filter((posting) => {
      const normalizedBranches = posting.branches.map((item) => item.toLowerCase());
      const matchesBranch =
        selectedBranches.length === 0 ||
        selectedBranches.some((selected) => {
          const option = branchOptions.find((item) => item.label === selected);
          return option?.matches.some((match) =>
            normalizedBranches.some((item) => item.includes(match)),
          );
        });
      if (!matchesBranch) return false;
      if (!normalizedSearch) return true;

      return [
        posting.role_title,
        posting.companies?.name ?? "",
        posting.branches.join(" "),
        posting.description ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [postings, search, selectedBranches]);

  const hasFilters = search.trim() !== "" || selectedBranches.length > 0;

  function clearFilters() {
    setSearch("");
    setSelectedBranches([]);
  }

  function toggleBranch(label: string) {
    setSelectedBranches((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label],
    );
  }

  return (
    <section aria-label="Filter job openings">
      <div className="card mb-5 p-4">
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="job-search" className="field-label">
              Search openings
            </label>
            <input
              id="job-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by role, company, branch..."
              className="input-field"
            />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((open) => !open)}
              aria-expanded={filterOpen}
              aria-controls="branch-filter-options"
              className="btn-secondary w-full justify-between sm:w-auto"
            >
              <span>
                Filter by branch or field
                {selectedBranches.length > 0 && (
                  <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                    {selectedBranches.length}
                  </span>
                )}
              </span>
              <span aria-hidden="true" className="text-slate-400">
                {filterOpen ? "▴" : "▾"}
              </span>
            </button>

            {filterOpen && (
              <fieldset
                id="branch-filter-options"
                className="absolute left-0 top-full z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white p-4 shadow-xl sm:w-[34rem]"
              >
                <legend className="sr-only">Filter by branch or field</legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {branchOptions.map((option) => (
                    <label
                      key={option.label}
                      className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={selectedBranches.includes(option.label)}
                        onChange={() => toggleBranch(option.label)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <p className="text-xs text-slate-500">
                    {selectedBranches.length
                      ? `${selectedBranches.length} selected`
                      : "Select one or more filters"}
                  </p>
                  <div className="flex gap-2">
                    {selectedBranches.length > 0 && (
                      <button type="button" onClick={clearFilters} className="btn-ghost">
                        Clear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setFilterOpen(false)}
                      className="btn-primary min-h-9 px-3 py-1.5"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </fieldset>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              {selectedBranches.length
                ? `${selectedBranches.length} filter${selectedBranches.length === 1 ? "" : "s"} selected`
                : "No branch filters selected"}
            </p>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="btn-secondary">
                Clear all
              </button>
            )}
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-500" aria-live="polite">
          Showing {filteredPostings.length} of {postings.length} openings
        </p>
      </div>

      {!filteredPostings.length ? (
        <EmptyState
          icon={<Icon name="inbox" />}
          title="No openings match your filters"
          description="Try a different search or clear the filters to see all active openings."
          action={
            <button type="button" onClick={clearFilters} className="btn-secondary">
              Clear filters
            </button>
          }
        />
      ) : (
        <FadeInStagger className="space-y-3 sm:space-y-4">
          {filteredPostings.map((posting) => (
            <ExpandablePostingCard
              key={posting.id}
              posting={posting}
              mine={interestByPosting[posting.id]}
            />
          ))}
        </FadeInStagger>
      )}
    </section>
  );
}
