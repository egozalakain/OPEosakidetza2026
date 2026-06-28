import sys,re,itertools,unicodedata,difflib,fitz
sys.path.insert(0,sys.argv[1]+"/scripts")
from lib import norm,ratio,pdf_text,parse_official,parse_osakiprep
BASE=sys.argv[1]
EX=BASE+"/examenes/"

def take_castellano(qs):
    out=[];seen=False
    for q in qs:
        if q['num']==1:
            if seen:break
            seen=True
        out.append(q)
    return out
def model_of(path):
    t=pdf_text(path)[:4000]
    m=re.search(r'Modelo\s+([A-D])',t)
    return m.group(1) if m else '?'
def prep(qs):
    for q in qs: q['nq']=norm(q['q']); q['no']={L:norm(q['opts'][L]) for L in 'abcd'}
    return qs
def best_perm(qa,qb):
    bp=None;bs=-1
    for perm in itertools.permutations('abcd'):
        s=sum(ratio(qa['no'][L],qb['no'][perm[i]]) for i,L in enumerate('abcd'))
        if s>bs:bs=s;bp=perm
    return bp,bs/4
def compare(src,dst,thr=0.86):
    """match each src q to best dst q by text; classify option order"""
    ident=0;perm=[];weak=0
    for qa in src:
        qb=max(dst,key=lambda q:ratio(qa['nq'],q['nq']))
        if ratio(qa['nq'],qb['nq'])<thr: weak+=1; continue
        p,avg=best_perm(qa,qb)
        if p==tuple('abcd'): ident+=1
        else: perm.append((qa.get('num'),qb.get('num'),''.join(p),round(avg,2)))
    return ident,perm,weak

CATS=[("tel","esk_tel.pdf"),("tcae","esk_tcae.pdf"),("celador","esk_celador.pdf"),
      ("enf","esk_enf.pdf"),("fisio","esk_fisio.pdf"),("admin","esk_admin.pdf"),
      ("auxadm","esk_auxadm.pdf"),("tsag","esk_tsag.pdf")]
print("%-9s %-7s %-22s %-26s"%("CAT","ESKmod","A-vs-B (opciones)","OsakiPrepA-vs-ESKofic"))
print("-"*78)
results={}
for cat,eskf in CATS:
    try:
        A=prep(parse_osakiprep(EX+f"op_{cat}_cuad_A.pdf"))
        B=prep(parse_osakiprep(EX+f"op_{cat}_cuad_B.pdf"))
    except Exception as e:
        print("%-9s ERROR osakiprep %s"%(cat,e)); continue
    esk=prep(take_castellano(parse_official(pdf_text(EX+eskf))))
    eskmod=model_of(EX+eskf)
    iAB,pAB,wAB=compare(A,B)
    # faithfulness: compare osakiprep (model matching esk) to esk; try A and B, pick the one with more identity
    iA,pA,wA=compare(A,esk); iB,pB,wB=compare(B,esk)
    if iA>=iB: fid=(iA,len(pA),wA,'A')
    else: fid=(iB,len(pB),wB,'B')
    results[cat]=dict(eskmod=eskmod,nA=len(A),nB=len(B),nesk=len(esk),
                      AB=(iAB,len(pAB),wAB),fid=fid,pAB=pAB)
    print("%-9s %-7s id=%-3d perm=%-3d weak=%-3d   id=%-3d perm=%-3d weak=%-3d (vs ofic mod %s)"%(
        cat,eskmod,iAB,len(pAB),wAB,fid[0],fid[1],fid[2],fid[3]))
# detail any real permutations in A-vs-B
print("\n=== Permutaciones REALES en A-vs-B (si las hay) ===")
any_perm=False
for cat,r in results.items():
    if r['pAB']:
        any_perm=True
        print(cat, r['pAB'][:5])
if not any_perm: print("NINGUNA. En todas las categorias, A y B tienen las opciones en el mismo orden.")
