# Component Plan: Inventory & Scan

## Goal
Identify all active files in `src/` containing `placeholder=` and exclude `*.backup`, `letters_backup`, and `public/`.

## Interfaces
- Input: Repository files under `src/`
- Output: Scoped list of files to update (active only)

## Tasks
1. Run targeted search for `placeholder=` in `src/` only.
2. Filter out files with `.backup` in the filename and `letters_backup` paths.
3. Record file list for subsequent component execution.
4. Validate by rerunning the search after filtering logic.

## Validation
- Confirm no `placeholder=` results outside the filtered active set.
