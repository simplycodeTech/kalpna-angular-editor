import { Component, ViewChild, ElementRef, AfterViewInit, Input, ViewEncapsulation  } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { robotoFont } from '../../assets/font/roboto-font';
import { MuktaFont } from '../../assets/font/mukta-font-verified';
import * as mammoth from 'mammoth';
import htmlToPdfmake from 'html-to-pdfmake';
import { html as beautifyHtml } from 'js-beautify';

declare let window: any;

@Component({
  selector: 'app-editor',
  standalone: false,
  templateUrl: 'editor.component.html',
  styleUrl: 'editor.component.css',
    encapsulation: ViewEncapsulation.None
})
export class EditorComponent implements  AfterViewInit {
   @Input() licenseKey?: string;
   @Input() uploadHook: {
  image?: (file: File) => Promise<string>,
  pdf?: (file: File) => Promise<string>
} = {};

   showWatermark =true;
  isSourceView: boolean = false;
  sourceHtml: string = '';
  showToolbar = false;
  position = { top: 0, left: 0 };
  savedRange: Range | null = null;
  undoStack: string[] = [];
  redoStack: string[] = [];
  selectedFontSize: string = '`Default`';
  showLineHeight = false;
  isLinkSelected = false;
  selectedFormat = 'paragraph';
  lineHeights: string[] = ['1', '1.5', '2', '2.5', '3'];
  fontSizes: string[] = [
    '8px', '10px', '12px', '14px', '16px', '18px',
    '20px', '22px', '24px', '28px', '30px', '32px',
    '36px', '48px', '72px', 'Default',
  ];
  showForm = false;
  rows?: number;
  cols?: number;
  @ViewChild('editor, editorRef', { static: false }) editorRef!: ElementRef<HTMLDivElement>;
  @ViewChild('sourceEditor', { static: false }) sourceEditorRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('textColorInput') textColorInput!: ElementRef<HTMLInputElement>;
  @ViewChild('bgColorInput') bgColorInput!: ElementRef<HTMLInputElement>;
  constructor(private http: HttpClient) {}


  handleEditorEvents(event: any) {
    this.saveSelection();
    this.detectFontSize();
    this.checkLinkSelection();
    this.onTextSelect(event);
  }

  handleDocxUpload(event: any) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e: any) => {
    const arrayBuffer = e.target.result;
    const result = await mammoth.convertToHtml({ arrayBuffer });

    this.editorRef.nativeElement.innerHTML = result.value; // clean HTML inject
  };
  reader.readAsArrayBuffer(file);
}

triggerFileUpload() {
  const fileInput = document.getElementById('wordUpload') as HTMLInputElement;
  if (fileInput) {
    fileInput.click();
  }
}

editorEnabled: boolean = true;

ngOnInit() {
  const isFree = this.licenseKey?.startsWith('FREE') === true;
  const isPro = this.licenseKey?.startsWith('PRO') === true;

  this.showWatermark = isFree;
  this.editorEnabled = isFree || isPro;

  if (!this.editorEnabled) {
    console.error('❌ Invalid or missing license. Editor is disabled.');
  }
}

  ngAfterViewInit() {
  this.editorRef.nativeElement.addEventListener('paste', this.handlePaste.bind(this));

  window.pdfMake.vfs = {
    ...robotoFont.vfs,
    'Mukta-Regular.ttf': MuktaFont.vfs['Mukta-Regular.ttf'],
    'Mukta-Bold.ttf': MuktaFont.vfs['Mukta-Bold.ttf'],
  };

  window.pdfMake.fonts = {
    ...robotoFont.fonts,
    Mukta: {
      normal: 'Mukta-Regular.ttf',
      bold: 'Mukta-Bold.ttf',
      italics: 'Mukta-Regular.ttf',
      bolditalics: 'Mukta-Regular.ttf',
    }
  };

setTimeout(() => {

  if (this.licenseKey?.startsWith('FREE')) {
  setInterval(() => {
    const watermark = document.querySelector('.watermark-box');
    if (!watermark) {
      console.warn('⚠️ Watermark removed – disabling editor');
      this.editorRef.nativeElement.setAttribute('contenteditable', 'false');
        this.editorRef.nativeElement.innerHTML = `<div class="text-danger text-center">⚠️ Kalpna Editor is disabled due to missing, invalid license or watermark removal. </div>`;
    }
  }, 50); // check every 5 seconds
}
  }, 1000); // give DOM time to render

}




private pasteLock = false;


handlePaste(event: ClipboardEvent) {
  if (this.pasteLock) {
    console.warn('⛔ Skipping duplicate paste event');
    return;
  }

  this.pasteLock = true;
  setTimeout(() => this.pasteLock = false, 50); // Reset lock after 50ms

  event.preventDefault();
  const clipboardData = event.clipboardData;
  const html = clipboardData?.getData('text/html') || '';
  const plain = clipboardData?.getData('text/plain') || '';

  // console.log('HTML from clipboard:', html);
  // console.log('Plain text from clipboard:', plain);

  
  if (html && html.includes('<')) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');


    const wordDropdowns = doc.querySelectorAll('w\\:sdt');
wordDropdowns.forEach((node: Element) => {
  const content = node.querySelector('w\\:sdtContent');
  if (content) {
    const text = content.textContent?.trim();
    const span = doc.createElement('span');
    span.innerText = text || '';
    node.replaceWith(span);
  }
});

    const removeTags = ['o:p', 'w:sdt', 'w:sdtpr', 'w:listitem', 'xml', 'w:tbl', 'w:tr', 'w:tc', 'w:smarttag'];

    removeTags.forEach(tag => {
      const elements = doc.getElementsByTagName(tag);
      while (elements.length > 0) {
        elements[0].remove();
      }
    });

    doc.querySelectorAll('*').forEach(el => {
      
      if (el instanceof HTMLElement) {
        el.removeAttribute('lang');

        if (el.hasAttribute('style')) {
          const style = el.getAttribute('style') || '';
          const allowedAlignments = ['text-align:center', 'text-align: right', 'text-align: left'];
          const cleanedStyle = style
            .split(';')
            .filter(rule => {
              const trimmed = rule.trim().toLowerCase();
              return (
                trimmed &&
                (allowedAlignments.includes(trimmed) ||
                  (!trimmed.includes('font-family') &&
                    !trimmed.includes('mso-')))
              );
            })
            .join(';');

          if (cleanedStyle.trim()) {
            el.setAttribute('style', cleanedStyle);
          } else {
            el.removeAttribute('style');
          }
        }
if (el.tagName === 'P' && el.getAttribute('class')?.toLowerCase().includes('center')) {
  el.style.textAlign = 'center';
}

        const inner = el.innerHTML.trim();
        if (!inner || inner === '<br>' || inner === '&nbsp;' || el.textContent?.trim() === '') {
          el.remove();
        }
      }
    });

    let cleanHTML = doc.body.innerHTML;

 cleanHTML = cleanHTML
  .replace(/<div>\s*(<br\s*\/?>)?\s*<\/div>/gi, '')
    .replace(/(<br\s*\/?>\s*){2,}/gi, '<br>')  
  .replace(/<br>\s*<br>/g, '')
  .replace(/<br\s*\/?>/g, '')
  .replace(/\n+/g, '')
  .replace(/\u00A0/g, ' ')   
  .replace(/\s{2,}/g, ' ')
  .replace(/^<br\s*\/?>|<br\s*\/?>$/gi, '') 
  .replace(/\u00A0/g, ' ')
  .replace(/<br\s*\/?>\s*(<\/?(ul|ol|li|table|thead|tbody|tr|td|th))/gi, '$1') 
  .replace(/<br\s*\/?>\s*(<\/?(ul|ol|li|p|div|table|tr|td|th|h\d))>/gi, '$1')
  .replace(/(<\/?(ul|ol|li|table|thead|tbody|tr|td|th)[^>]*>)\s*<br\s*\/?>/gi, '$1')
  .replace(/(<\/?(ul|ol|li|p|div|table|tr|td|th|h\d)[^>]*>)\s*<br\s*\/?>/gi, '$1')
  .replace(/<(li|p|div)[^>]*>\s*<br\s*\/?>\s*<\/\1>/gi, '')
  .replace(/(<br\s*\/?>\s*){2,}/gi, '<br>')
  .replace(/^<br\s*\/?>|<br\s*\/?>$/gi, '')
  .replace(/&nbsp;/g, ' ')
  .replace(/<p>\s*<\/p>/gi, '')
  .replace(/<p>(&nbsp;|\s|<br\s*\/?>)*<\/p>/gi, '')
  .replace(/<p><\/p>/gi, '')

  // ✅ Merge consecutive span tags with Devanagari characters
  .replace(/(<span[^>]*>)([\u0900-\u097F]+)<\/span>\s*(<span[^>]*>)([\u0900-\u097F]+)<\/span>/g,
    (_match, span1, text1, span2, text2) => {
      const combined = text1 + text2;
      // Use span1's style, discard second
      const styleMatch = span1.match(/style="[^"]*"/);
      const style = styleMatch ? styleMatch[0] : '';
      return `<span ${style}>${combined}</span>`;
    })

  // ✅ Fix span fusion edge case
  .replace(/(<\/span>)(<span[^>]*>)/g, (match, p1, p2) => {
    return p1.endsWith('> ') || p2.startsWith(' <') ? `${p1}${p2}` : `${p1} ${p2}`;
  })

  // ✅ Strip hidden/zero-width Unicode
  .replace(/\u200C/g, '')     // Zero-width non-joiner
  .replace(/\u200D/g, '')     // Zero-width joiner
  .replace(/\u200B/g, '')     // Zero-width space
  .replace(/\uFEFF/g, '')     // BOM
  .replace(/\u202F/g, ' ')    // Narrow no-break space
  .replace(/\u2060/g, '')     // Word Joiner
  .replace(/\u205F/g, ' ')    // Medium mathematical space
  .replace(/\u3000/g, ' ')    // Ideographic space
  .replace(/\u180E/g, '')     // Mongolian vowel separator

  // ✅ Join Devanagari characters if any special char is in between
  .replace(/([\u0900-\u097F])[\u200B\u200C\u200D\u00A0\u202F\u2060\u205F\u3000\u180E]+([\u0900-\u097F])/g, '$1$2');

    
    this.restoreSelection();
    document.execCommand('insertHTML', false, cleanHTML);
  } else if (plain) {
    this.restoreSelection();
    document.execCommand('insertText', false, plain);
  }
}



exportPDFWithPdfMake() {
  let html = this.editorRef.nativeElement.innerHTML;

  html = html
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '<br>');

  let content = htmlToPdfmake(html);

  content = Array.isArray(content)
    ? content.map((block: any) => {
        const allText = JSON.stringify(block);
        const isMarathi = /[\u0900-\u097F]/.test(allText);
        return {
          ...block,
          font: isMarathi ? 'Mukta' : 'Roboto',
        };
      })
    : content;

  const docDefinition = {
    content: Array.isArray(content) ? content : [content],
    
    defaultStyle: {
      font: 'Mukta',
      fontSize: 13,
      lineHeight:0.7,
    },
   
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
  };

  window.pdfMake.createPdf(docDefinition).download('marathi-export.pdf');
}


  private insertBlockAtCursor(node: HTMLElement) {
    this.restoreSelection();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      this.editorRef.nativeElement.appendChild(node);
      return;
    }

    const range = selection.getRangeAt(0);
    const editor = this.editorRef.nativeElement;

    if (!editor.contains(range.commonAncestorContainer)) {
      editor.appendChild(node);
      return;
    }

    // Insert the node at cursor position
    range.deleteContents();
    range.insertNode(node);

    // ✅ Move caret/cursor just after inserted node (NO <br>, NO &nbsp;)
    const newRange = document.createRange();
    newRange.setStartAfter(node);
    newRange.setEndAfter(node);
    selection.removeAllRanges();
    selection.addRange(newRange);

    this.savedRange = newRange;
    editor.focus();
  }

  detectFontSize() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      this.selectedFontSize = 'Default';
      return;
    }
    const range = selection.getRangeAt(0);
    const parent = range.startContainer.parentElement;
    if (parent && parent.style.fontSize) {
      this.selectedFontSize = parent.style.fontSize;
    } else {
      this.selectedFontSize = 'Default';
    }
  }




clearFormatting() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);

  const start = range.startContainer.parentElement as HTMLElement;
  const end = range.endContainer.parentElement as HTMLElement;

  const allElements = new Set<HTMLElement>();
  if (start) allElements.add(start);
  if (end) allElements.add(end);

  allElements.forEach((el) => {
    if (el && el.style) {
      console.log(`Removing style from`, el);
      el.removeAttribute('style'); // ✅ only style removed
    }
  });
}









  saveSelection() {
    const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);

  // ✅ ensure range is inside the editor only
  if (this.editorRef.nativeElement.contains(range.commonAncestorContainer)) {
    this.savedRange = range;
  }
  }

  restoreSelection() {
    const selection = window.getSelection();
    if (this.savedRange && selection) {
      selection.removeAllRanges();
      selection.addRange(this.savedRange);
    }
  }



applyStyle(styleType: keyof CSSStyleDeclaration, value: string) {
  if (!this.savedRange || this.savedRange.collapsed) return;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = this.savedRange;
  const commonAncestor = range.commonAncestorContainer;
  const parentEl = commonAncestor instanceof HTMLElement
    ? commonAncestor
    : commonAncestor.parentElement;

  if (parentEl && parentEl !== this.editorRef.nativeElement) {
    // ✅ Apply style directly to existing parent
    (parentEl.style as any)[styleType] = value;
    this.savedRange = range;
    return;
  }

  const span = document.createElement('span');
  (span.style as any)[styleType] = value;
  span.textContent = range.toString();

  range.deleteContents();
  range.insertNode(span);

  const newRange = document.createRange();
  newRange.selectNodeContents(span);
  selection.removeAllRanges();
  selection.addRange(newRange);
  this.savedRange = newRange;
}

  applyFontSize(size: string) {
    this.applyStyle('fontSize', size === 'Default' ? '' : size);
    this.selectedFontSize = size;
  }

  applyLineHeightValue(value: string) {
    this.showLineHeight = false;
    this.applyStyle('lineHeight', value);
  }



applyColorLive(styleType: 'color' | 'backgroundColor', event: Event) {
  const input = event.target as HTMLInputElement;
  const selectedValue = input.value;
  this.applyStyle(styleType, selectedValue);
}


  openColorPicker(type: 'text' | 'bg') {
    if (type === 'text') {
      this.textColorInput.nativeElement.click();
    } else if (type === 'bg') {
      this.bgColorInput.nativeElement.click();
    }
  }

  checkLinkSelection() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const parent = range.startContainer.parentElement;
      this.isLinkSelected = !!(parent && parent.closest('a'));
    } else {
      this.isLinkSelected = false;
    }
  }

  onTextSelect(event: MouseEvent) {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      this.position = {
        top: rect.top + window.scrollY - 40,
        left: rect.left + window.scrollX,
      };
      this.showToolbar = true;
    } else {
      this.showToolbar = false;
    }
  }

  saveState() {
    const html = this.editorRef.nativeElement.innerHTML;
    this.undoStack.push(html);
    this.redoStack = [];
  }

  undo() {
    if (this.undoStack.length > 0) {
      const current = this.editorRef.nativeElement.innerHTML;
      this.redoStack.push(current);
      const previous = this.undoStack.pop();
      if (previous !== undefined) {
        this.editorRef.nativeElement.innerHTML = previous;
      }
    }
  }

  redo() {
    if (this.redoStack.length > 0) {
      const current = this.editorRef.nativeElement.innerHTML;
      this.undoStack.push(current);
      const next = this.redoStack.pop();
      if (next !== undefined) {
        this.editorRef.nativeElement.innerHTML = next;
      }
    }
  }

 insertImage() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';

  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    if (this.uploadHook?.image) {
      try {
        const imageUrl = await this.uploadHook.image(file);

        const img = document.createElement('img');
        img.src = imageUrl;
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.display = 'block';

        const wrapper = document.createElement('p');
        wrapper.contentEditable = 'false';
        wrapper.style.display = 'inline-block';
        wrapper.style.resize = 'both';
        wrapper.style.overflow = 'auto';
        wrapper.style.maxWidth = '100%';
        wrapper.style.border = '1px dashed transparent';

        wrapper.appendChild(img);
        this.insertBlockAtCursor(wrapper);
      } catch (err) {
        console.error('Image upload failed:', err);
        alert('Image upload failed!');
      }
    } else {
      alert('No uploadHook.image() defined!');
    }
  };

  input.click();
}

applyTextDecoration(decoration: string) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  const selectedText = selection.toString().trim();
  if (!selectedText) return;

  const parent = range.startContainer.parentElement as HTMLElement;

  if (parent && parent.style) {
    let current = parent.style.textDecoration || "";
    let decorations = current.split(" ").map((d: string) => d.trim()).filter(Boolean);

    const index = decorations.indexOf(decoration);
    if (index > -1) {
      decorations.splice(index, 1); // remove
    } else {
      decorations.push(decoration); // add
    }

    parent.style.textDecoration = decorations.join(" ");
  }
}



  toggleForm() {
    this.showForm = !this.showForm;
  }



onFormatChange(selectEl: HTMLSelectElement) {
  const value = selectEl.value;

  switch (value) {
    case 'paragraph':
      this.insertText('Sample Text');
      break;
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      this.insertHeading(value);
      break;
  }

  // Reset select so that same option can be reselected
  selectEl.value = '';
}


insertText(text: string) {
  const selection = window.getSelection();
  const range = selection?.getRangeAt(0);
  if (!range) return;

  const textNode = document.createTextNode(text);
  range.deleteContents();
  range.insertNode(textNode);

  const newRange = document.createRange();
  newRange.setStartAfter(textNode);
  newRange.setEndAfter(textNode);
  selection?.removeAllRanges();
  selection?.addRange(newRange);
  this.savedRange = newRange;
}

insertHeading(tag: string) {
  if (!this.savedRange) return;

  const selection = window.getSelection();
  const heading = document.createElement(tag);
  heading.textContent = 'Heading Text';

  const range = this.savedRange.cloneRange(); // ✅ Use saved range
  range.deleteContents();
  range.insertNode(heading);

  // Move cursor after heading
  const newRange = document.createRange();
  newRange.setStartAfter(heading);
  newRange.setEndAfter(heading);
  selection?.removeAllRanges();
  selection?.addRange(newRange);

  this.savedRange = newRange; // 🔁 Update saved range
}


removeEmptyPTags() {
  const editor = this.editorRef.nativeElement;
  editor.innerHTML = editor.innerHTML
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/\n+/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/<p>(&nbsp;|\s|<br\s*\/?>)*<\/p>/gi, '')
    .replace(/<p><\/p>/gi, '')
    .replace(/<br\s*\/?>/gi, '') // remove all <br>
    .replace(/&nbsp;/g, ' ')     // convert nbsp to space
    .replace(/<div>\s*<br\s*\/?>\s*<\/div>/gi, '') // ✅ remove <div><br></div>
    .replace(/(<br\s*\/?>\s*){2,}/gi, '<br>');     // collapse multiple <br>
}



  format(command: string) {
    if (command === 'createLink') {
      const url = prompt('Enter link URL:');
      if (url) {
        document.execCommand('createLink', false, url);
        const target = prompt(
          'Open link in new tab? Type "_blank", "_self", etc. or leave empty:'
        );
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const anchor = range.startContainer.parentElement;
          if (anchor && anchor.tagName === 'A' && target) {
            anchor.setAttribute('target', target);
          }
        }
      }
    } else {
      document.execCommand(command, false, '');
    }
    this.showToolbar = false;
  }

  insertUnorderedList() {
    document.execCommand('insertUnorderedList', false, '');
  }

  insertOrderedList() {
    document.execCommand('insertOrderedList', false, '');
  }

insertTable() {
  if (!this.rows || !this.cols || this.rows < 1 || this.cols < 1) {
    alert('Please enter valid number of rows and columns');
    return;
  }

  const table = document.createElement('table');
  table.setAttribute('border', '1');
 // table.style.width = '100%';
 // table.style.tableLayout = 'auto';
 // table.style.borderCollapse = 'collapse';
//  table.style.fontSize = '14px';

  const colWidth = `${100 / this.cols!}%`; // ✅ Dynamic column width

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');

  for (let j = 0; j < this.cols!; j++) {
    const th = document.createElement('th');
    th.textContent = `Header ${j + 1}`;
   //  th.style.border = '1px solid black';
    // th.style.padding = '6px';
    // th.style.backgroundColor = '#f1f1f1';
    // th.style.textAlign = 'left';
   // th.style.width = colWidth; // ✅ width per column
    headRow.appendChild(th);
  }

  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  for (let i = 1; i < this.rows!; i++) {
    const tr = document.createElement('tr');
    for (let j = 0; j < this.cols!; j++) {
      const td = document.createElement('td');
      td.textContent = `Row ${i + 1} Col ${j + 1}`;
   //    td.style.border = '1px solid black';
      // td.style.padding = '6px';
    //  td.style.width = colWidth; // ✅ width per column
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  this.insertBlockAtCursor(table);

  this.rows = undefined;
  this.cols = undefined;
  this.showForm = false;
}


  private cleanWhiteSpaceSpans(html: string): string {
    return html.replace(/<span style="white-space:\s*pre">\s*<\/span>/gi, '');
  }

  
toggleSourceCode() {
  this.isSourceView = !this.isSourceView;
  const editor = this.editorRef.nativeElement;

  if (this.isSourceView) {
    // ✅ Save original HTML for restore
    this.sourceHtml = editor.innerHTML;

    // ✅ Show beautified text as preview only
    const formatted = beautifyHtml(this.sourceHtml, {
      indent_size: 2,
      wrap_line_length: 80,
      preserve_newlines: true,
    });

    editor.innerText = formatted;
    editor.setAttribute('contenteditable', 'true'); // disable editing
    editor.style.whiteSpace = 'pre-wrap';
    editor.style.fontFamily = 'monospace';
  } else {
    // ✅ Restore back original unformatted HTML
    editor.innerHTML = this.sourceHtml;
    editor.setAttribute('contenteditable', 'true');
    editor.style.whiteSpace = '';
    editor.style.fontFamily = '';
  }
}


 insertPDF() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/pdf';

  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    if (this.uploadHook?.pdf) {
      try {
        const pdfUrl = await this.uploadHook.pdf(file);
        const fileName = file.name;

        const linkHTML = `<a href="${pdfUrl}" target="_blank">${fileName}</a>`;

        this.restoreSelection();
        document.execCommand('insertHTML', false, linkHTML);
      } catch (err) {
        console.error('PDF upload failed:', err);
        alert('PDF upload failed!');
      }
    } else {
      alert('No uploadHook.pdf() defined!');
    }
  };

  input.click();
}

}
