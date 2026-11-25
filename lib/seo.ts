// Per-tool SEO data, generated from lib/tools.ts + the keyword database
// (~/workspace/your_files/PDF-World-Keyword-Database.csv).
// Primary/secondary keywords come from the database only; the CSV has no
// search-volume column, so no volumes are recorded anywhere here.

export interface ToolSeo {
  slug: string;
  title: string;
  category: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  seoTitle: string;
  description: string;
  h1: string;
  h2s: string[];
  faqs: { q: string; a: string }[];
}

export const TOOL_SEO: Record<string, ToolSeo> = {
  "merge-pdf": {
  "slug": "merge-pdf",
  "title": "Merge PDF",
  "category": "Organise",
  "primaryKeyword": "merge pdf",
  "secondaryKeywords": [
    "merge pdf free",
    "merge pdf online",
    "merge pdf online free"
  ],
  "seoTitle": "Merge PDF Online Free | PDF World",
  "description": "Combine several PDF files into one document, in the order you choose. Free, no sign-up. Your files never leave your browser.",
  "h1": "Merge PDF — free online",
  "h2s": [
    "How to use Merge PDF",
    "Frequently asked questions",
    "More organise tools"
  ],
  "faqs": [
    {
      "q": "Is Merge PDF free?",
      "a": "Yes. Merge PDF on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use Merge PDF?",
      "a": "No. Merge PDF runs entirely in your browser, so your files never leave your device and nothing is stored afterwards."
    },
    {
      "q": "What are the limits of Merge PDF?",
      "a": "Merges the pages of each file in order. Encrypted PDFs cannot be merged unless unlocked first."
    }
  ]
},
  "split-pdf": {
  "slug": "split-pdf",
  "title": "Split PDF",
  "category": "Organise",
  "primaryKeyword": "split pdf",
  "secondaryKeywords": [
    "split pdf free",
    "split pdf online",
    "split pdf online free"
  ],
  "seoTitle": "Split PDF Online Free | PDF World",
  "description": "Pull pages out of a PDF by page range, or split every page into its own file, downloaded as a ZIP. Free, no sign-up. Your files never leave your browser.",
  "h1": "Split PDF — free online",
  "h2s": [
    "How to use Split PDF",
    "Frequently asked questions",
    "More organise tools"
  ],
  "faqs": [
    {
      "q": "Is Split PDF free?",
      "a": "Yes. Split PDF on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use Split PDF?",
      "a": "No. Split PDF runs entirely in your browser, so your files never leave your device and nothing is stored afterwards."
    },
    {
      "q": "What are the limits of Split PDF?",
      "a": "Page ranges use 1-based page numbers, e.g. 1-3, 5, 8-10. Out-of-range pages are ignored."
    }
  ]
},
  "compress-pdf": {
  "slug": "compress-pdf",
  "title": "Compress PDF",
  "category": "Organise",
  "primaryKeyword": "compress pdf",
  "secondaryKeywords": [
    "compress pdf free",
    "compress pdf online",
    "compress pdf online free"
  ],
  "seoTitle": "Compress PDF Online Free | PDF World",
  "description": "Shrink a PDF to a smaller file size. Light mode re-saves the file; stronger modes rebuild pages as… Free, no sign-up. Your files never leave your browser.",
  "h1": "Compress PDF — free online",
  "h2s": [
    "How to use Compress PDF",
    "Frequently asked questions",
    "More organise tools"
  ],
  "faqs": [
    {
      "q": "Is Compress PDF free?",
      "a": "Yes. Compress PDF on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use Compress PDF?",
      "a": "No. Compress PDF runs entirely in your browser, so your files never leave your device and nothing is stored afterwards."
    },
    {
      "q": "What are the limits of Compress PDF?",
      "a": "Compression is approximate and depends on the file. Stronger modes rebuild pages as images, so text is no longer selectable. If the result is larger than the original, we say so plainly."
    }
  ]
},
  "jpg-to-pdf": {
  "slug": "jpg-to-pdf",
  "title": "JPG to PDF",
  "category": "Convert",
  "primaryKeyword": "jpg to pdf",
  "secondaryKeywords": [
    "jpg to pdf free",
    "jpg to pdf online",
    "jpg to pdf online free"
  ],
  "seoTitle": "JPG to PDF Online Free | PDF World",
  "description": "Turn JPG and PNG images into a PDF, one image per page. Free, no sign-up. Your files never leave your browser.",
  "h1": "JPG to PDF — free online",
  "h2s": [
    "How to use JPG to PDF",
    "Frequently asked questions",
    "More convert tools"
  ],
  "faqs": [
    {
      "q": "Is JPG to PDF free?",
      "a": "Yes. JPG to PDF on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use JPG to PDF?",
      "a": "No. JPG to PDF runs entirely in your browser, so your files never leave your device and nothing is stored afterwards."
    },
    {
      "q": "What are the limits of JPG to PDF?",
      "a": "Accepts JPG and PNG images. Images are embedded as-is; no OCR is performed."
    }
  ]
},
  "pdf-to-jpg": {
  "slug": "pdf-to-jpg",
  "title": "PDF to JPG",
  "category": "Convert",
  "primaryKeyword": "pdf to jpg",
  "secondaryKeywords": [
    "pdf to jpg free",
    "pdf to jpg online",
    "pdf to jpg online free"
  ],
  "seoTitle": "PDF to JPG Online Free | PDF World",
  "description": "Convert every page of a PDF into a JPG image, downloaded together as a ZIP file. Free, no sign-up. Your files never leave your browser.",
  "h1": "PDF to JPG — free online",
  "h2s": [
    "How to use PDF to JPG",
    "Frequently asked questions",
    "More convert tools"
  ],
  "faqs": [
    {
      "q": "Is PDF to JPG free?",
      "a": "Yes. PDF to JPG on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use PDF to JPG?",
      "a": "No. PDF to JPG runs entirely in your browser, so your files never leave your device and nothing is stored afterwards."
    },
    {
      "q": "What are the limits of PDF to JPG?",
      "a": "Pages are rendered as images, so the text in the JPGs is not selectable. Quality depends on the resolution you pick."
    }
  ]
},
  "rotate-pdf": {
  "slug": "rotate-pdf",
  "title": "Rotate PDF",
  "category": "Edit",
  "primaryKeyword": "rotate pdf",
  "secondaryKeywords": [
    "rotate pdf free",
    "rotate pdf online",
    "rotate pdf online free"
  ],
  "seoTitle": "Rotate PDF Online Free | PDF World",
  "description": "Rotate pages 90°, 180° or 270°. Rotate the whole document at once, or pick individual pages. Free, no sign-up. Your files never leave your browser.",
  "h1": "Rotate PDF — free online",
  "h2s": [
    "How to use Rotate PDF",
    "Frequently asked questions",
    "More edit tools"
  ],
  "faqs": [
    {
      "q": "Is Rotate PDF free?",
      "a": "Yes. Rotate PDF on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use Rotate PDF?",
      "a": "No. Rotate PDF runs entirely in your browser, so your files never leave your device and nothing is stored afterwards."
    },
    {
      "q": "What are the limits of Rotate PDF?",
      "a": "Rotation is applied to the page itself, so it stays rotated in every reader."
    }
  ]
},
  "organize-pdf": {
  "slug": "organize-pdf",
  "title": "Organize PDF",
  "category": "Organise",
  "primaryKeyword": "organize pdf",
  "secondaryKeywords": [
    "organize pdf free",
    "organize pdf online",
    "organize pdf online free"
  ],
  "seoTitle": "Organize PDF Online Free | PDF World",
  "description": "See every page as a thumbnail, drag them into a new order, and delete the pages you do not need. Free, no sign-up. Your files never leave your browser.",
  "h1": "Organize PDF — free online",
  "h2s": [
    "How to use Organize PDF",
    "Frequently asked questions",
    "More organise tools"
  ],
  "faqs": [
    {
      "q": "Is Organize PDF free?",
      "a": "Yes. Organize PDF on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use Organize PDF?",
      "a": "No. Organize PDF runs entirely in your browser, so your files never leave your device and nothing is stored afterwards."
    },
    {
      "q": "What are the limits of Organize PDF?",
      "a": "Thumbnails are rendered in your browser from the file itself. Very large PDFs may take a moment to preview."
    }
  ]
},
  "watermark": {
  "slug": "watermark",
  "title": "Watermark",
  "category": "Edit",
  "primaryKeyword": "watermark pdf",
  "secondaryKeywords": [
    "watermark pdf free",
    "watermark pdf online",
    "watermark pdf online free"
  ],
  "seoTitle": "Watermark PDF Online Free | PDF World",
  "description": "Stamp text across your PDF pages — a draft mark, a name, or a notice — with control over position… Free, no sign-up. Your files never leave your browser.",
  "h1": "Watermark PDF — free online",
  "h2s": [
    "How to use Watermark",
    "Frequently asked questions",
    "More edit tools"
  ],
  "faqs": [
    {
      "q": "Is Watermark free?",
      "a": "Yes. Watermark on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use Watermark?",
      "a": "No. Watermark runs entirely in your browser, so your files never leave your device and nothing is stored afterwards."
    },
    {
      "q": "What are the limits of Watermark?",
      "a": "The watermark is drawn onto each page as text. It is visible in any reader, but it is not a security feature."
    }
  ]
},
  "page-numbers": {
  "slug": "page-numbers",
  "title": "Page Numbers",
  "category": "Edit",
  "primaryKeyword": "add page numbers to pdf",
  "secondaryKeywords": [
    "add page numbers to pdf free",
    "add page numbers to pdf online",
    "add page numbers to pdf online free"
  ],
  "seoTitle": "Add Page Numbers to PDF Online Free | PDF World",
  "description": "Add page numbers to every page of a PDF — bottom centre, corners, or top — in a clean, readable… Free, no sign-up. Your files never leave your browser.",
  "h1": "Add Page Numbers to PDF — free online",
  "h2s": [
    "How to use Page Numbers",
    "Frequently asked questions",
    "More edit tools"
  ],
  "faqs": [
    {
      "q": "Is Page Numbers free?",
      "a": "Yes. Page Numbers on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use Page Numbers?",
      "a": "No. Page Numbers runs entirely in your browser, so your files never leave your device and nothing is stored afterwards."
    },
    {
      "q": "What are the limits of Page Numbers?",
      "a": "Numbers are drawn near the page edge. Existing page numbers in the original are not removed."
    }
  ]
},
  "protect-pdf": {
  "slug": "protect-pdf",
  "title": "Protect PDF",
  "category": "Secure",
  "primaryKeyword": "protect pdf",
  "secondaryKeywords": [
    "protect pdf free",
    "protect pdf online",
    "protect pdf online free"
  ],
  "seoTitle": "Protect PDF Online Free | PDF World",
  "description": "Add a password to a PDF so it can only be opened by someone who knows it. Free, no sign-up. Your files never leave your browser.",
  "h1": "Protect PDF — free online",
  "h2s": [
    "How to use Protect PDF",
    "Frequently asked questions",
    "More secure tools"
  ],
  "faqs": [
    {
      "q": "Is Protect PDF free?",
      "a": "Yes. Protect PDF on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use Protect PDF?",
      "a": "No. Protect PDF runs entirely in your browser, so your files never leave your device and nothing is stored afterwards."
    },
    {
      "q": "What are the limits of Protect PDF?",
      "a": "Uses the standard PDF security handler with 40-bit RC4 encryption (the widely compatible basic level). It stops casual opening without the password, but 40-bit encryption is not strong by modern standards — do not rely on it for highly sensitive documents."
    }
  ]
},
  "unlock-pdf": {
  "slug": "unlock-pdf",
  "title": "Unlock PDF",
  "category": "Secure",
  "primaryKeyword": "unlock pdf",
  "secondaryKeywords": [
    "unlock pdf free",
    "unlock pdf online",
    "unlock pdf online free"
  ],
  "seoTitle": "Unlock PDF Online Free | PDF World",
  "description": "Remove the password from a PDF you already know the password for. Free, no sign-up. Your files never leave your browser.",
  "h1": "Unlock PDF — free online",
  "h2s": [
    "How to use Unlock PDF",
    "Frequently asked questions",
    "More secure tools"
  ],
  "faqs": [
    {
      "q": "Is Unlock PDF free?",
      "a": "Yes. Unlock PDF on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use Unlock PDF?",
      "a": "No. Unlock PDF runs entirely in your browser, so your files never leave your device and nothing is stored afterwards."
    },
    {
      "q": "What are the limits of Unlock PDF?",
      "a": "Only works with a password you already know — this tool never guesses or cracks passwords. A wrong password shows an error. The unlocked copy is rebuilt from rendered pages, so its text is not selectable."
    }
  ]
},
  "pdf-to-word": {
  "slug": "pdf-to-word",
  "title": "PDF to Word",
  "category": "Convert",
  "primaryKeyword": "pdf to word",
  "secondaryKeywords": [
    "pdf to word free",
    "pdf to word online",
    "pdf to word online free"
  ],
  "seoTitle": "PDF to Word Online Free | PDF World",
  "description": "Turn a PDF into an editable Word (.docx) document, one page at a time. Free, no sign-up. Your files never leave your browser.",
  "h1": "PDF to Word — free online",
  "h2s": [
    "How to use PDF to Word",
    "Frequently asked questions",
    "More convert tools"
  ],
  "faqs": [
    {
      "q": "Is PDF to Word free?",
      "a": "Yes. PDF to Word on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use PDF to Word?",
      "a": "No. PDF to Word runs entirely in your browser, so your files never leave your device and nothing is stored afterwards."
    },
    {
      "q": "What are the limits of PDF to Word?",
      "a": "Approximation: this extracts the PDF's text and rebuilds it as a Word document. Layout reflows, and images, tables and fonts are not preserved."
    }
  ]
},
  "pdf-to-pptx": {
  "slug": "pdf-to-pptx",
  "title": "PDF to PowerPoint",
  "category": "Convert",
  "primaryKeyword": "pdf to powerpoint",
  "secondaryKeywords": [
    "pdf to powerpoint free",
    "pdf to powerpoint online",
    "pdf to powerpoint online free"
  ],
  "seoTitle": "PDF to Powerpoint Online Free | PDF World",
  "description": "Turn a PDF into a PowerPoint (.pptx) deck, one slide per page. Free, no sign-up. Your files never leave your browser.",
  "h1": "PDF to Powerpoint — free online",
  "h2s": [
    "How to use PDF to PowerPoint",
    "Frequently asked questions",
    "More convert tools"
  ],
  "faqs": [
    {
      "q": "Is PDF to PowerPoint free?",
      "a": "Yes. PDF to PowerPoint on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use PDF to PowerPoint?",
      "a": "No. PDF to PowerPoint runs entirely in your browser, so your files never leave your device and nothing is stored afterwards."
    },
    {
      "q": "What are the limits of PDF to PowerPoint?",
      "a": "Approximation: this extracts the PDF's text and rebuilds it as slides. Layout reflows, and images, charts and designs are not preserved."
    }
  ]
},
  "pdf-to-excel": {
  "slug": "pdf-to-excel",
  "title": "PDF to Excel",
  "category": "Convert",
  "primaryKeyword": "pdf to excel",
  "secondaryKeywords": [
    "pdf to excel free",
    "pdf to excel online",
    "pdf to excel online free"
  ],
  "seoTitle": "PDF to Excel Online Free | PDF World",
  "description": "Turn a PDF into a spreadsheet (.xlsx), one sheet per page. Free, no sign-up. Your files never leave your browser.",
  "h1": "PDF to Excel — free online",
  "h2s": [
    "How to use PDF to Excel",
    "Frequently asked questions",
    "More convert tools"
  ],
  "faqs": [
    {
      "q": "Is PDF to Excel free?",
      "a": "Yes. PDF to Excel on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use PDF to Excel?",
      "a": "No. PDF to Excel runs entirely in your browser, so your files never leave your device and nothing is stored afterwards."
    },
    {
      "q": "What are the limits of PDF to Excel?",
      "a": "Approximation: tables are guessed from text spacing, so columns may need checking. Layout and images are not preserved."
    }
  ]
},
  "word-to-pdf": {
  "slug": "word-to-pdf",
  "title": "Word to PDF",
  "category": "Convert",
  "primaryKeyword": "word to pdf",
  "secondaryKeywords": [
    "word to pdf free",
    "word to pdf online",
    "word to pdf online free"
  ],
  "seoTitle": "Word to PDF Online Free | PDF World",
  "description": "Turn a Word (.docx) document into a PDF. The text is extracted and rendered into a clean PDF. Free, no sign-up. Your files never leave your browser.",
  "h1": "Word to PDF — free online",
  "h2s": [
    "How to use Word to PDF",
    "Frequently asked questions",
    "More convert tools"
  ],
  "faqs": [
    {
      "q": "Is Word to PDF free?",
      "a": "Yes. Word to PDF on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use Word to PDF?",
      "a": "No. Word to PDF runs entirely in your browser, so your files never leave your device and nothing is stored afterwards."
    },
    {
      "q": "What are the limits of Word to PDF?",
      "a": "Approximation: text is extracted and re-rendered, so the original Word layout, images and tables are not preserved."
    }
  ]
},
  "pptx-to-pdf": {
  "slug": "pptx-to-pdf",
  "title": "PowerPoint to PDF",
  "category": "Convert",
  "primaryKeyword": "powerpoint to pdf",
  "secondaryKeywords": [
    "powerpoint to pdf free",
    "powerpoint to pdf online",
    "powerpoint to pdf online free"
  ],
  "seoTitle": "Powerpoint to PDF Online Free | PDF World",
  "description": "Turn a PowerPoint (.pptx) presentation into a PDF, one slide per page. Free, no sign-up. Your files never leave your browser.",
  "h1": "Powerpoint to PDF — free online",
  "h2s": [
    "How to use PowerPoint to PDF",
    "Frequently asked questions",
    "More convert tools"
  ],
  "faqs": [
    {
      "q": "Is PowerPoint to PDF free?",
      "a": "Yes. PowerPoint to PDF on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use PowerPoint to PDF?",
      "a": "No. PowerPoint to PDF runs entirely in your browser, so your files never leave your device and nothing is stored afterwards."
    },
    {
      "q": "What are the limits of PowerPoint to PDF?",
      "a": "Approximation: slide text is extracted and re-rendered. Slide designs, images, charts and animations are not preserved."
    }
  ]
},
  "excel-to-pdf": {
  "slug": "excel-to-pdf",
  "title": "Excel to PDF",
  "category": "Convert",
  "primaryKeyword": "excel to pdf",
  "secondaryKeywords": [
    "excel to pdf free",
    "excel to pdf online",
    "excel to pdf online free"
  ],
  "seoTitle": "Excel to PDF Online Free | PDF World",
  "description": "Turn a spreadsheet (.xlsx, .xls or .csv) into a PDF, with each sheet rendered as a table. Free, no sign-up. Your files never leave your browser.",
  "h1": "Excel to PDF — free online",
  "h2s": [
    "How to use Excel to PDF",
    "Frequently asked questions",
    "More convert tools"
  ],
  "faqs": [
    {
      "q": "Is Excel to PDF free?",
      "a": "Yes. Excel to PDF on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use Excel to PDF?",
      "a": "No. Excel to PDF runs entirely in your browser, so your files never leave your device and nothing is stored afterwards."
    },
    {
      "q": "What are the limits of Excel to PDF?",
      "a": "Approximation: sheet data is rendered as simple tables. Long cell text is truncated, and charts and formulas appear as their values."
    }
  ]
},
  "ocr-pdf": {
  "slug": "ocr-pdf",
  "title": "OCR PDF",
  "category": "Edit",
  "primaryKeyword": "ocr pdf",
  "secondaryKeywords": [
    "ocr pdf free",
    "ocr pdf online",
    "ocr pdf online free"
  ],
  "seoTitle": "OCR PDF Online Free | PDF World",
  "description": "Read the text in scanned or image-based PDFs and rebuild them as searchable text PDFs, using OCR in… Free, no sign-up. Your files never leave your browser.",
  "h1": "OCR PDF — free online",
  "h2s": [
    "How to use OCR PDF",
    "Frequently asked questions",
    "More edit tools"
  ],
  "faqs": [
    {
      "q": "Is OCR PDF free?",
      "a": "Yes. OCR PDF on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use OCR PDF?",
      "a": "No. OCR PDF runs entirely in your browser, so your files never leave your device and nothing is stored afterwards."
    },
    {
      "q": "What are the limits of OCR PDF?",
      "a": "Slow on long documents, English only, and accuracy varies with scan quality. The OCR engine loads from a CDN the first time you use it."
    }
  ]
},
  "edit-pdf": {
  "slug": "edit-pdf",
  "title": "Edit PDF",
  "category": "Edit",
  "primaryKeyword": "edit pdf",
  "secondaryKeywords": [
    "edit pdf free",
    "edit pdf online",
    "edit pdf online free"
  ],
  "seoTitle": "Edit PDF Online Free | PDF World",
  "description": "Add a text note or a highlight band to any page of your PDF. Free, no sign-up. Your files never leave your browser.",
  "h1": "Edit PDF — free online",
  "h2s": [
    "How to use Edit PDF",
    "Frequently asked questions",
    "More edit tools"
  ],
  "faqs": [
    {
      "q": "Is Edit PDF free?",
      "a": "Yes. Edit PDF on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use Edit PDF?",
      "a": "No. Edit PDF runs entirely in your browser, so your files never leave your device and nothing is stored afterwards."
    },
    {
      "q": "What are the limits of Edit PDF?",
      "a": "Annotations only: this adds new text or a highlight on top of a page. It cannot change or delete the document's existing text."
    }
  ]
},
  "pdf-to-markdown": {
  "slug": "pdf-to-markdown",
  "title": "PDF to Markdown",
  "category": "Convert",
  "primaryKeyword": "pdf to markdown",
  "secondaryKeywords": [
    "pdf to markdown free",
    "pdf to markdown online",
    "pdf to markdown online free"
  ],
  "seoTitle": "PDF to Markdown Online Free | PDF World",
  "description": "Extract the text from a PDF into a Markdown (.md) file, with headings guessed from short lines. Free, no sign-up. Your files never leave your browser.",
  "h1": "PDF to Markdown — free online",
  "h2s": [
    "How to use PDF to Markdown",
    "Frequently asked questions",
    "More convert tools"
  ],
  "faqs": [
    {
      "q": "Is PDF to Markdown free?",
      "a": "Yes. PDF to Markdown on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use PDF to Markdown?",
      "a": "No. PDF to Markdown runs entirely in your browser, so your files never leave your device and nothing is stored afterwards."
    },
    {
      "q": "What are the limits of PDF to Markdown?",
      "a": "Text extraction plus reflow, not a perfect conversion: headings are guessed, and images, tables and layout are not preserved."
    }
  ]
},
  "compare-pdf": {
  "slug": "compare-pdf",
  "title": "Compare PDF",
  "category": "Edit",
  "primaryKeyword": "compare pdf",
  "secondaryKeywords": [
    "compare pdf free",
    "compare pdf online",
    "compare pdf online free"
  ],
  "seoTitle": "Compare PDF Online Free | PDF World",
  "description": "Compare two PDFs line by line and see which pages differ, with a downloadable report of the added… Free, no sign-up. Your files never leave your browser.",
  "h1": "Compare PDF — free online",
  "h2s": [
    "How to use Compare PDF",
    "Frequently asked questions",
    "More edit tools"
  ],
  "faqs": [
    {
      "q": "Is Compare PDF free?",
      "a": "Yes. Compare PDF on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use Compare PDF?",
      "a": "No. Compare PDF runs entirely in your browser, so your files never leave your device and nothing is stored afterwards."
    },
    {
      "q": "What are the limits of Compare PDF?",
      "a": "Compares extracted text only. Differences in images, fonts or layout are not detected, and scanned PDFs need OCR first."
    }
  ]
},
  "redact-pdf": {
  "slug": "redact-pdf",
  "title": "Redact PDF",
  "category": "Edit",
  "primaryKeyword": "redact pdf",
  "secondaryKeywords": [
    "redact pdf free",
    "redact pdf online",
    "redact pdf online free"
  ],
  "seoTitle": "Redact PDF Online Free | PDF World",
  "description": "Black out words or whole pages in a PDF. The redacted text is genuinely removed, and the result is… Free, no sign-up. Your files never leave your browser.",
  "h1": "Redact PDF — free online",
  "h2s": [
    "How to use Redact PDF",
    "Frequently asked questions",
    "More edit tools"
  ],
  "faqs": [
    {
      "q": "Is Redact PDF free?",
      "a": "Yes. Redact PDF on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use Redact PDF?",
      "a": "No. Redact PDF runs entirely in your browser, so your files never leave your device and nothing is stored afterwards."
    },
    {
      "q": "What are the limits of Redact PDF?",
      "a": "Redacted pages are rebuilt as text-only, so images and vector graphics on those pages are not preserved. Always check the verification note after redacting."
    }
  ]
},
  "crop-pdf": {
  "slug": "crop-pdf",
  "title": "Crop PDF",
  "category": "Edit",
  "primaryKeyword": "crop pdf",
  "secondaryKeywords": [
    "crop pdf free",
    "crop pdf online",
    "crop pdf online free"
  ],
  "seoTitle": "Crop PDF Online Free | PDF World",
  "description": "Trim the margins off your PDF pages by percentage — all pages, or just the ones you pick. Free, no sign-up. Your files never leave your browser.",
  "h1": "Crop PDF — free online",
  "h2s": [
    "How to use Crop PDF",
    "Frequently asked questions",
    "More edit tools"
  ],
  "faqs": [
    {
      "q": "Is Crop PDF free?",
      "a": "Yes. Crop PDF on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use Crop PDF?",
      "a": "No. Crop PDF runs entirely in your browser, so your files never leave your device and nothing is stored afterwards."
    },
    {
      "q": "What are the limits of Crop PDF?",
      "a": "Cropping changes the page boxes; the trimmed area is hidden, not deleted from the file's content stream."
    }
  ]
},
  "pdf-forms": {
  "slug": "pdf-forms",
  "title": "PDF Forms",
  "category": "Edit",
  "primaryKeyword": "fill pdf form",
  "secondaryKeywords": [
    "fill pdf form free",
    "fill pdf form online",
    "fill pdf form online free"
  ],
  "seoTitle": "Fill PDF Form Online Free | PDF World",
  "description": "Fill in the fields of a PDF form — text boxes, checkboxes and dropdowns — and save a filled copy. Free, no sign-up. Your files never leave your browser.",
  "h1": "Fill PDF Form — free online",
  "h2s": [
    "How to use PDF Forms",
    "Frequently asked questions",
    "More edit tools"
  ],
  "faqs": [
    {
      "q": "Is PDF Forms free?",
      "a": "Yes. PDF Forms on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use PDF Forms?",
      "a": "No. PDF Forms runs entirely in your browser, so your files never leave your device and nothing is stored afterwards."
    },
    {
      "q": "What are the limits of PDF Forms?",
      "a": "Only works with PDFs that already have fillable AcroForm fields. If the PDF has no form fields, the tool says so — it cannot turn a flat PDF into a form."
    }
  ]
},
  "repair-pdf": {
  "slug": "repair-pdf",
  "title": "Repair PDF",
  "category": "Edit",
  "primaryKeyword": "repair pdf",
  "secondaryKeywords": [
    "repair pdf free",
    "repair pdf online",
    "repair pdf online free"
  ],
  "seoTitle": "Repair PDF Online Free | PDF World",
  "description": "Try to fix a damaged or misbehaving PDF by re-saving it cleanly in your browser. Free, no sign-up. Your files never leave your browser.",
  "h1": "Repair PDF — free online",
  "h2s": [
    "How to use Repair PDF",
    "Frequently asked questions",
    "More edit tools"
  ],
  "faqs": [
    {
      "q": "Is Repair PDF free?",
      "a": "Yes. Repair PDF on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use Repair PDF?",
      "a": "No. Repair PDF runs entirely in your browser, so your files never leave your device and nothing is stored afterwards."
    },
    {
      "q": "What are the limits of Repair PDF?",
      "a": "Fixes some corruption only — re-saving repairs structural problems, but badly damaged files may still fail. Not a guaranteed repair."
    }
  ]
},
  "pdf-to-pdfa": {
  "slug": "pdf-to-pdfa",
  "title": "PDF to PDF/A",
  "category": "Convert",
  "primaryKeyword": "pdf to pdfa",
  "secondaryKeywords": [
    "pdf to pdfa free",
    "pdf to pdfa online",
    "pdf to pdfa online free"
  ],
  "seoTitle": "PDF to Pdfa Online Free | PDF World",
  "description": "Add PDF/A-style archival metadata to a PDF, including an XMP metadata packet and document… Free, no sign-up. Your files never leave your browser.",
  "h1": "PDF to Pdfa — free online",
  "h2s": [
    "How to use PDF to PDF/A",
    "Frequently asked questions",
    "More convert tools"
  ],
  "faqs": [
    {
      "q": "Is PDF to PDF/A free?",
      "a": "Yes. PDF to PDF/A on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use PDF to PDF/A?",
      "a": "No. PDF to PDF/A runs entirely in your browser, so your files never leave your device and nothing is stored afterwards."
    },
    {
      "q": "What are the limits of PDF to PDF/A?",
      "a": "Metadata only: this adds PDF/A-style XMP metadata and document info. It is NOT a certified PDF/A file — fonts are not embedded or validated."
    }
  ]
},
  "html-to-pdf": {
  "slug": "html-to-pdf",
  "title": "HTML to PDF",
  "category": "Convert",
  "primaryKeyword": "html to pdf",
  "secondaryKeywords": [
    "html to pdf free",
    "html to pdf online",
    "html to pdf online free"
  ],
  "seoTitle": "HTML to PDF Online Free | PDF World",
  "description": "Paste HTML or upload an .html file, preview it, and print it to PDF with your browser — or download… Free, no sign-up. Your files never leave your browser.",
  "h1": "HTML to PDF — free online",
  "h2s": [
    "How to use HTML to PDF",
    "Frequently asked questions",
    "More convert tools"
  ],
  "faqs": [
    {
      "q": "Is HTML to PDF free?",
      "a": "Yes. HTML to PDF on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use HTML to PDF?",
      "a": "No. HTML to PDF runs entirely in your browser, so your files never leave your device and nothing is stored afterwards."
    },
    {
      "q": "What are the limits of HTML to PDF?",
      "a": "Basic styling only: external images, fonts and scripts are not loaded. The styled PDF comes from your browser's print dialog (“Save as PDF”)."
    }
  ]
},
  "sign-pdf": {
  "slug": "sign-pdf",
  "title": "Sign PDF",
  "category": "Edit",
  "primaryKeyword": "sign pdf",
  "secondaryKeywords": [
    "sign pdf free",
    "sign pdf online",
    "sign pdf online free"
  ],
  "seoTitle": "Sign PDF Online Free | PDF World",
  "description": "Draw or type a signature and place it on the page of your choice. Free, no sign-up. Your files never leave your browser.",
  "h1": "Sign PDF — free online",
  "h2s": [
    "How to use Sign PDF",
    "Frequently asked questions",
    "More edit tools"
  ],
  "faqs": [
    {
      "q": "Is Sign PDF free?",
      "a": "Yes. Sign PDF on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use Sign PDF?",
      "a": "No. Sign PDF runs entirely in your browser, so your files never leave your device and nothing is stored afterwards."
    },
    {
      "q": "What are the limits of Sign PDF?",
      "a": "A simple placed signature image — not a certified digital signature. It does not prove who signed or protect the document from changes."
    }
  ]
},
  "scan-to-pdf": {
  "slug": "scan-to-pdf",
  "title": "Scan to PDF",
  "category": "Convert",
  "primaryKeyword": "scan to pdf",
  "secondaryKeywords": [
    "scan to pdf free",
    "scan to pdf online",
    "scan to pdf online free"
  ],
  "seoTitle": "Scan to PDF Online Free | PDF World",
  "description": "Combine photos of pages into a single PDF, one image per page. Free, no sign-up. Your files never leave your browser.",
  "h1": "Scan to PDF — free online",
  "h2s": [
    "How to use Scan to PDF",
    "Frequently asked questions",
    "More convert tools"
  ],
  "faqs": [
    {
      "q": "Is Scan to PDF free?",
      "a": "Yes. Scan to PDF on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use Scan to PDF?",
      "a": "No. Scan to PDF runs entirely in your browser, so your files never leave your device and nothing is stored afterwards."
    },
    {
      "q": "What are the limits of Scan to PDF?",
      "a": "Image upload only: this works from image files you upload. It cannot use your phone camera or a scanner directly."
    }
  ]
},
  "ai-summarizer": {
  "slug": "ai-summarizer",
  "title": "AI Summarizer",
  "category": "AI",
  "primaryKeyword": "summarize pdf",
  "secondaryKeywords": [
    "summarize pdf free",
    "summarize pdf online",
    "summarize pdf online free"
  ],
  "seoTitle": "Summarize PDF Online Free | PDF World",
  "description": "Get the key sentences of a PDF as a short summary. Free, no sign-up. Your files never leave your browser.",
  "h1": "Summarize PDF — free online",
  "h2s": [
    "How to use AI Summarizer",
    "Frequently asked questions",
    "More ai tools"
  ],
  "faqs": [
    {
      "q": "Is AI Summarizer free?",
      "a": "Yes. AI Summarizer on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use AI Summarizer?",
      "a": "No. AI Summarizer runs entirely in your browser, so your files never leave your device and nothing is stored afterwards."
    },
    {
      "q": "What are the limits of AI Summarizer?",
      "a": "Template-based — no AI model. It scores the document's own sentences by word frequency and keeps the best ones; it cannot write new insights, and it needs at least 40 words of extractable text. Scanned PDFs need OCR first."
    }
  ]
},
  "translate-pdf": {
  "slug": "translate-pdf",
  "title": "Translate PDF",
  "category": "AI",
  "primaryKeyword": "translate pdf",
  "secondaryKeywords": [
    "translate pdf free",
    "translate pdf online",
    "translate pdf online free"
  ],
  "seoTitle": "Translate PDF Online Free | PDF World",
  "description": "Translate a PDF's text into another language using the free, no-key MyMemory service. Free, no sign-up. Your files never leave your browser.",
  "h1": "Translate PDF — free online",
  "h2s": [
    "How to use Translate PDF",
    "Frequently asked questions",
    "More ai tools"
  ],
  "faqs": [
    {
      "q": "Is Translate PDF free?",
      "a": "Yes. Translate PDF on PDF World is free to use, with no account, no sign-up and no limit on how many tasks you run."
    },
    {
      "q": "Are my files uploaded when I use Translate PDF?",
      "a": "The file itself is never uploaded. Only the text extracted from your PDF is sent to the free MyMemory translation service so it can be translated."
    },
    {
      "q": "What are the limits of Translate PDF?",
      "a": "Free MyMemory service, no key needed: about 5,000 characters per document and per day on the shared anonymous quota, in chunks of ~450 characters. Machine translation is approximate — check important wording. The extracted text is sent to MyMemory's servers for translation; the rest of the work stays in your browser."
    }
  ]
},
};
