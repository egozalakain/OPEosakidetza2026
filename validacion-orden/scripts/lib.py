import re,unicodedata,difflib,fitz
def norm(s):
    s=unicodedata.normalize('NFKD',s or "");s=''.join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r'\s+',' ',re.sub(r'[^a-z0-9]+',' ',s)).strip()
def ratio(a,b): return difflib.SequenceMatcher(None,a,b).ratio()
# Footer cleaner. Footers look like: "<real text> CATEGORIA EN MAYUS / Modelo X Castellano  CA-7"
# Anchor on "/ Modelo [A-D]" (never in a real option); strip the trailing UPPERCASE
# category block before it (case-sensitive so real lowercase text is untouched), then page codes.
_CATBLOCK=re.compile(r'\s*[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ./()\- ]{2,}/\s*Modelo\s+[A-DA-Z].*$')
_MODELO=re.compile(r'\s*/\s*Modelo\s+[A-D].*$',re.I)
_TAIL=re.compile(r'\s*(=====PAGE.*|\bPREGUNTAS\b|ERRESERBA GALDERAK|epe\s*ope|\b[A-Z]{1,3}-\d+\b).*$')
_EUS=re.compile(r'\s*(OSAKIDETZA\s+)?[A-D]\s+Eredua\b.*$')          # basque footer "... B Eredua"
_EUSCAT=re.compile(r'\s*[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ./()\- ]{2,}/\s*[A-D]\s+Eredua.*$')
def clean_line(ln):
    if re.search(r'/\s*Modelo\s+[A-D]',ln,re.I):
        ln=_CATBLOCK.sub('',ln); ln=_MODELO.sub('',ln)
    if re.search(r'[A-D]\s+Eredua',ln):
        ln=_EUSCAT.sub('',ln); ln=_EUS.sub('',ln)
    ln=_TAIL.sub('',ln)
    return ln
def pdf_text(path):
    d=fitz.open(path); return "\n".join(d[i].get_text() for i in range(d.page_count))
def parse_official(text):
    # official osakidetza cuadernillo: 'N.-' then q then 'a)' etc.
    lines=[clean_line(l) for l in text.split('\n')]
    qs=[];cur=None;co=None
    qm=re.compile(r'^\s*(\d{1,3})\.-\s*(.*)$');om=re.compile(r'^\s*([a-d])\)\s*(.*)$')
    P=lambda b:' '.join(w.strip() for w in b if w.strip())
    for ln in lines:
        m=qm.match(ln)
        if m:
            if cur:qs.append(cur)
            cur={'num':int(m.group(1)),'q':[m.group(2)],'opts':{x:[] for x in 'abcd'}};co=None;continue
        if cur is None:continue
        mo=om.match(ln)
        if mo: co=mo.group(1);cur['opts'][co].append(mo.group(2));continue
        if co:cur['opts'][co].append(ln)
        else:cur['q'].append(ln)
    if cur:qs.append(cur)
    out=[{'num':q['num'],'q':P(q['q']),'opts':{L:P(q['opts'][L]) for L in 'abcd'}} for q in qs]
    return [q for q in out if all(q['opts'][L] for L in 'abcd')]
def parse_osakiprep(path):
    lines=[l.rstrip() for l in pdf_text(path).split('\n')]
    qs=[];i=0;n=len(lines);optre=re.compile(r'^([a-d])\)\s*(.*)$')
    while i<n:
        if re.match(r'^\d{1,3}$',lines[i].strip()) and i+1<n and lines[i+1].strip()=='EXAMEN':
            num=int(lines[i].strip());i+=2;qt=[]
            while i<n and not optre.match(lines[i].strip()):
                if re.match(r'^\d{1,3}$',lines[i].strip()) and i+1<n and lines[i+1].strip()=='EXAMEN':break
                qt.append(lines[i]);i+=1
            opts=[];cur=None;official=None
            while i<n:
                ln=lines[i].strip()
                if re.match(r'^\d{1,3}$',ln) and i+1<n and lines[i+1].strip()=='EXAMEN':break
                m=optre.match(ln)
                if m:cur=[m.group(1),[m.group(2)]];opts.append(cur);i+=1;continue
                if ln=='OFICIAL':
                    if cur:official=cur[0]
                    i+=1;continue
                if ln=='' or ln=='EXAMEN':i+=1;continue
                if cur is not None:cur[1].append(ln)
                i+=1
            o={L:'' for L in 'abcd'}
            for L,p in opts:o[L]=' '.join(x.strip() for x in p if x.strip())
            qs.append({'num':num,'q':' '.join(x.strip() for x in qt if x.strip()),'opts':o,'official':official})
        else:i+=1
    return [q for q in qs if all(q['opts'][L] for L in 'abcd')]
