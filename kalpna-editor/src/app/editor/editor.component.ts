import { Component, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { html as beautifyHtml } from 'js-beautify';

declare let window: any;

@Component({
  selector: 'app-editor',
  standalone: false,
  templateUrl: './editor.component.html',
  styleUrl: './editor.component.css',
})
export class EditorComponent {
  isSourceView: boolean = false;
  showToolbar = false;
  position = { top: 0, left: 0 };
  savedRange: Range | null = null;
  undoStack: string[] = [];
  redoStack: string[] = [];
  selectedFontSize: string = '`Default`';
  showLineHeight = false;
  isLinkSelected = false;
  lineHeights: string[] = ['1', '1.5', '2', '2.5', '3'];
  fontSizes: string[] = [
    '8px',
    '10px',
    '12px',
    '14px',
    '16px',
    '18px',
    '20px',
    '22px',
    '24px',
    '28px',
    '30px',
    '32px',
    '36px',
    '48px',
    '72px',
    'Default',
  ];
  showForm = false;
  rows?: number;
  cols?: number;

  @ViewChild('editor', { static: true }) editorRef!: ElementRef<HTMLDivElement>;
  @ViewChild('textColorInput') textColorInput!: ElementRef<HTMLInputElement>;
  @ViewChild('bgColorInput') bgColorInput!: ElementRef<HTMLInputElement>;

  constructor(private http: HttpClient) {}

  handleEditorEvents(event: any) {
    this.saveSelection();
    this.detectFontSize();
    this.checkLinkSelection();
    this.onTextSelect(event);
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

  saveSelection() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      this.savedRange = selection.getRangeAt(0).cloneRange();
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
    const selectionText = this.savedRange.toString().trim();
    if (!selectionText) return;

    const selection = window.getSelection();
    const range = this.savedRange;
    const parent = range.startContainer.parentElement;

    if (parent?.tagName === 'SPAN') {
      (parent.style as any)[styleType] = value;
      return;
    }

    const span = document.createElement('span');
    (span.style as any)[styleType] = value;
    span.textContent = selectionText;

    range.deleteContents();
    range.insertNode(span);

    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    selection?.removeAllRanges();
    selection?.addRange(newRange);
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
    const value = input.value;
    this.applyStyle(styleType, value);
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

    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        const formData = new FormData();
        formData.append('image', file);

        this.http
          .post<{ path: string }>(
            'http://localhost:3000/upload/image',
            formData
          )
          .subscribe((res) => {
            const img = document.createElement('img');
            img.src = `http://localhost:3000${res.path}`;
            img.style.width = '100%';
            img.style.height = 'auto';
            img.style.display = 'block';

            // 🧊 Invisible resizable wrapper
            const wrapper = document.createElement('div');
            wrapper.contentEditable = 'false'; // prevent editing inside
            wrapper.style.display = 'inline-block';
            wrapper.style.resize = 'both';
            wrapper.style.overflow = 'auto';
            wrapper.style.maxWidth = '100%';
            wrapper.style.border = '1px dashed transparent'; // invisible look

            wrapper.appendChild(img);

            // 🪄 Insert and auto-select
            this.insertBlockAtCursor(wrapper);
            setTimeout(() => {
              const range = document.createRange();
              range.selectNode(wrapper);
              const selection = window.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(range);
            }, 0);
          });
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

    const parent = range.startContainer.parentElement;
    const alreadyApplied = parent && parent.style.textDecoration === decoration;

    if (alreadyApplied) {
      parent.style.textDecoration = '';
      return;
    }

    const span = document.createElement('span');
    span.textContent = selectedText;
    span.style.textDecoration = decoration;

    range.deleteContents();
    range.insertNode(span);

    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }

  toggleForm() {
    this.showForm = !this.showForm;
  }

  insertText(text: string) {
    const span = document.createElement('p');
    span.innerText = text;
    this.insertBlockAtCursor(span);
  }

  insertHeading(tag: string) {
    const heading = document.createElement(tag);
    heading.innerText = 'Heading Text';
    this.insertBlockAtCursor(heading);
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
    table.className = 'table table-bordered table-striped';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (let j = 0; j < this.cols; j++) {
      const th = document.createElement('th');
      th.textContent = `Header ${j + 1}`;
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (let i = 1; i < this.rows; i++) {
      const tr = document.createElement('tr');
      for (let j = 0; j < this.cols; j++) {
        const td = document.createElement('td');
        td.textContent = `Row ${i + 1} Col ${j + 1}`;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    this.insertBlockAtCursor(table);

    this.showForm = false;
    this.rows = undefined;
    this.cols = undefined;
  }

  private cleanWhiteSpaceSpans(html: string): string {
    return html.replace(/<span style="white-space:\s*pre">\s*<\/span>/gi, '');
  }

  toggleSourceCode() {
    this.isSourceView = !this.isSourceView;
    const editor = this.editorRef.nativeElement;

    if (this.isSourceView) {
      const content = editor.innerHTML;
      const formatted = beautifyHtml(content, {
        indent_size: 2,
        wrap_line_length: 80,
        preserve_newlines: true,
      });

      // ✅ Clean junk spans
      const cleaned = this.cleanWhiteSpaceSpans(formatted);
      editor.innerText = cleaned;
    } else {
      editor.innerHTML = editor.innerText;
    }
  }
  insertPDF() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';

    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        const formData = new FormData();
        formData.append('pdf', file);

        this.http
          .post<{ filePath: string }>(
            'http://localhost:3000/upload/pdf',
            formData
          )
          .subscribe((res) => {
            const pdfUrl = `http://localhost:3000${res.filePath}`;
            const fileName = file.name; // e.g., Resume.pdf

            const linkHTML = `<a href="${pdfUrl}" target="_blank">${fileName}</a>`;

            // ✨ Use execCommand to insert pure HTML (no wrappers)
            this.restoreSelection();
            document.execCommand('insertHTML', false, linkHTML);
          });
      }
    };

    input.click();
  }
}
