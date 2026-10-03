NICTD site images
=================

Images are managed from the admin workspace: Administration > Image Library
(/admin/images). Upload, replace and delete are all done there; nothing needs to
be copied into these folders by hand any more.

Folders, one per collection. Collections are kept SEPARATE on purpose so the same
picture never shows up in two places on the site:

  hero/     the 4 home-page slider slides
  papers/   Featured Research Papers covers
  reports/  National ICT Reports covers (home page coverflow + /reports)
  news/     Latest News card pictures (empty by default: a navy panel shows)
  headers/  the wide banner at the top of each page

The files already in these folders are the built-in defaults. An upload is saved
alongside them as <slot>-<timestamp>.<ext> and recorded in image-manifest.json at
the project root; "Delete upload" removes that file and the slot falls back to its
built-in default. Defaults are never deleted by the admin screen.

Accepted: JPG, PNG, WebP, up to 8 MB. Uploads are checked by their actual file
bytes, so renaming a non-image to .jpg will be rejected.

Watch the file extension when adding a default by hand. Windows hides known
extensions, so a file saved as "slide-3.jpg" can really be "slide-3.jpg.png" and
will 404. Confirm with:  cmd /c dir /b public\img\hero
