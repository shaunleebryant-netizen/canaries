#!/usr/bin/env python3
"""Canary macro preview compute (PREVIEW ONLY 2026-10-14). Reads raw downloads in ../data, writes ../data/preview.json.
Sources: US Treasury daily par & real yield curves (public domain; same source FRED uses for DGS10/DGS2/DFII10),
BLS API v1 (CPI-U SA CUSR0000SA0, unemployment LNS14000000), Shiller ie_data.xls (shillerdata.com), Yahoo SPY (backtest only)."""
import csv,json,glob,os,statistics as st,datetime as dt,sys
D=os.path.join(os.path.dirname(__file__),'..','data')
def treas(pat,col):
    out={}
    for f in glob.glob(os.path.join(D,pat)):
        for r in csv.DictReader(open(f)):
            v=r.get(col)
            if v in (None,'','N/A'):continue
            m,d_,y=r['Date'].split('/'); out[f"{y}-{m}-{d_}"]=float(v)
    return dict(sorted(out.items()))
n10=treas('nom_*.csv','10 Yr'); n2=treas('nom_*.csv','2 Yr'); real=treas('real_*.csv','10 YR')
curve={d:round(n10[d]-n2[d],2) for d in n10 if d in n2}
def sma(a,i,n=20): return sum(a[i-n+1:i+1])/n if i>=n-1 else None
def curve_score(dates,vals,i):
    v=vals[i]; lo=max(0,i-126)
    if v<0: return -1,'inverted'
    if any(x<0 for x in vals[lo:i]): return -2,'re-steepening <6m after inversion'
    if v<0.25: return 0,'flat (0 to +0.25)'
    return 1,'normal (>= +0.25, no inversion in 6m)'
def real_score(vals,i):
    s=sma(vals,i); s5=sma(vals,i-5)
    if s is None or s5 is None or i<9: return None,''
    v=vals[i]; base=1 if v<s else -1   # inverse: rising real yield = worse
    sl=s-s5; c9=v-vals[i-9]
    if base==-1 and sl>0 and c9>0: base=-2
    if base==1 and sl<0 and c9<0: base=2
    note=''
    if v>=2.5 and base==2: base=1; note='restrictive >=2.50%: +2 capped at +1'
    return base,note
cd=list(curve); cv=[curve[d] for d in cd]
rd=list(real); rv=[real[d] for d in rd]
cs=[curve_score(cd,cv,i)[0] for i in range(len(cv))]
rs=[real_score(rv,i)[0] for i in range(len(rv))]
# SPY
j=json.load(open(os.path.join(D,'spy.json')))['chart']['result'][0]
adj=j['indicators']['adjclose'][0]['adjclose']
spy={dt.datetime.utcfromtimestamp(t-4*3600).strftime('%Y-%m-%d'):p for t,p in zip(j['timestamp'],adj) if p}
sd=list(spy); si={d:k for k,d in enumerate(sd)}
def bt(dates,scores,start='1993-02-01'):
    res={}
    for h in (20,60):
        b={}
        for d,s in zip(dates,scores):
            if s is None or d<start or d not in si: continue
            k=si[d]
            if k+h>=len(sd): continue
            b.setdefault(s,[]).append(spy[sd[k+h]]/spy[d]-1)
        allr=[x for v in b.values() for x in v]
        res[h]={'all':{'n':len(allr),'mean':round(100*st.mean(allr),2)},**{str(s):{'n':len(v),'mean':round(100*st.mean(v),2),'hit':round(100*sum(x>0 for x in v)/len(v),1)} for s,v in sorted(b.items())}}
    return res
btc=bt(cd,cs); btr=bt(rd,rs)
def chart(dates,vals,scores,ref=True,n=252):
    sl=slice(len(dates)-n,len(dates))
    return {'d':dates[sl],'y':vals[sl],'r':[round(sma(vals,i),4) if sma(vals,i) else None for i in range(len(vals))][sl] if ref else None,
            's':[None if s is None else (1 if s>0 else -1 if s<0 else 0) for s in scores][sl]}
i=len(cv)-1; ci=curve_score(cd,cv,i)
last_inv=max(k for k in range(len(cv)) if cv[k]<0)
k=len(rv)-1; ri=real_score(rv,k)
pct=lambda arr,v: round(100*sum(x<v for x in arr)/len(arr),1)
canaries={
 'curve-10y2y':{'name':'Yield curve (10y − 2y)','asOf':cd[-1],'value':cv[-1],'sma20':round(sma(cv,i),3),'chg9':round(cv[-1]-cv[-10],2),'score':ci[0],'band':ci[1],
   'lastInverted':cd[last_inv],'invertedSince1990pct':round(100*sum(x<0 for x in cv)/len(cv),1),'chart':{**chart(cd,cv,cs),'consts':[{'v':0,'label':'inverted below'},{'v':0.25,'label':'flat'}],'unit':'pct pts','lineLabel':'10y minus 2y Treasury yield (pct pts)','refLabel':'20-day average'},'backtest':btc},
 'real-10y':{'name':'10y real yield (TIPS)','asOf':rd[-1],'value':rv[-1],'sma20':round(sma(rv,k),3),'slope5':round(sma(rv,k)-sma(rv,k-5),3),'chg9':round(rv[-1]-rv[-10],2),'score':ri[0],'note':ri[1],
   'pctOfHistoryLower':pct(rv,rv[-1]),'max':max(zip(rv,rd)),'chart':{**chart(rd,rv,rs),'consts':[{'v':2.5,'label':'restrictive 2.50%'}],'unit':'%','lineLabel':'10-year TIPS real yield (%)','refLabel':'20-day average'},'backtest':btr},
}
# --- macro (monthly)
import xlrd
s=xlrd.open_workbook(os.path.join(D,'ie_data.xls')).sheet_by_name('Data')
rows=[]
for r in range(8,s.nrows):
    v=s.row_values(r)
    if not isinstance(v[0],float): continue
    y=int(v[0]); m=int(round((v[0]-y)*100)) or 10
    rows.append({'d':f"{y}-{m:02d}",'P':v[1],'D':v[2] if v[2]!='' else None,'E':v[3] if v[3]!='' else None,'GS10':v[6] if v[6]!='' else None,'CAPE':v[12] if isinstance(v[12],float) else None})
lastE=next(r for r in reversed(rows) if r['E']); lastD=next(r for r in reversed(rows) if r['D'])
def series(key):
    return [(r['d'],r[key]) for r in rows if r[key] is not None]
cape=series('CAPE')
ey=[(r['d'],round(100*r['E']/r['P'],3)) for r in rows if r['E']]
erp=[(r['d'],round(100*r['E']/r['P']-r['GS10'],3)) for r in rows if r['E'] and r['GS10'] is not None]
dy=[(r['d'],round(100*r['D']/r['P'],3)) for r in rows if r['D']]
# current ERP: trailing E (last reported) / latest price - latest 10y (Treasury daily)
eycur=round(100*lastE['E']/rows[-1]['P'],3); erpcur=round(eycur-n10[list(n10)[-1]],3); dycur=round(100*lastD['D']/rows[-1]['P'],3)
bls={}
for f in glob.glob(os.path.join(D,'bls_*.json')):
    for se in json.load(open(f))['Results']['series']:
        for o in se['data']:
            if o['period']=='M13' or o['value'] in ('-',''):continue
            try: bls.setdefault(se['seriesID'],{})[f"{o['year']}-{o['period'][1:]}"]=float(o['value'])
            except ValueError: pass
cpi=dict(sorted(bls['CUSR0000SA0'].items())); un=dict(sorted(bls['LNS14000000'].items()))
def ym_back(d,n):
    y,m=map(int,d.split('-')); t=y*12+m-1-n; return f"{t//12}-{t%12+1:02d}"
cpiy=[(d,round(100*(v/cpi[ym_back(d,12)]-1),2)) for d,v in cpi.items() if ym_back(d,12) in cpi]
ud=list(un)
sahm=[]
for q,d in enumerate(ud):
    if q<14: continue
    m3=[un[ud[q-z]] for z in range(3)]
    if any(ym_back(d,z)!=ud[q-z] for z in range(3)): continue
    a3=sum(m3)/3
    prev=[sum(un[ud[w-z]] for z in range(3))/3 for w in range(q-12,q)]
    sahm.append((d,round(a3-min(prev),2)))
def card(key,name,ser,cur=None,curDate=None,unit='',higherIsCheaper=False,note=''):
    vals=[v for _,v in ser]; ds=[d for d,_ in ser]
    v=cur if cur is not None else vals[-1]; cd_=curDate or ds[-1]
    prevv=vals[-2] if cur is None else vals[-1]
    mx=max(zip(vals,ds)); mn=min(zip(vals,ds))
    below=sum(x<v for x in vals)/len(vals)*100
    return {'key':key,'name':name,'unit':unit,'value':round(v,2),'asOf':cd_,'prev':round(prevv,2),'chg':round(v-prevv,2),
      'mean':round(st.mean(vals),2),'median':round(st.median(vals),2),'min':[round(mn[0],2),mn[1]],'max':[round(mx[0],2),mx[1]],
      'pctBelow':round(below,1),'cheaperPct':round(100-below,1) if not higherIsCheaper else round(below,1),
      'p':[round(sorted(vals)[int(len(vals)*q)],2) for q in (0.1,0.25,0.75,0.9)],'d':ds,'y':vals,'from':ds[0],'note':note,'cheapLabel':higherIsCheaper is not None}
macro=[
 card('cape','Shiller CAPE',cape,unit='x',note='Monthly average price ÷ 10-yr avg real earnings. Source: Robert J. Shiller, shillerdata.com (ie_data.xls). Latest month uses the '+rows[-1]['d']+' partial (Shiller note: Oct price is Oct 2nd close; CPI estimated).'),
 card('erp','Equity risk premium',erp,cur=erpcur,curDate=list(n10)[-1],unit='pts',higherIsCheaper=True,note=f"S&P earnings yield (trailing 12m E as of {lastE['d']}, Shiller) − 10y Treasury. Now {eycur:.2f}% − {n10[list(n10)[-1]]:.2f}% (Treasury {list(n10)[-1]}). History monthly using Shiller GS10."),
 card('dy','S&P 500 dividend yield',dy,cur=dycur,curDate=rows[-1]['d'],unit='%',higherIsCheaper=True,note=f"Trailing 12m dividends (latest {lastD['d']}) ÷ price {rows[-1]['d']}. Source: Shiller."),
 card('cpi','CPI inflation (y/y)',cpiy,unit='%',higherIsCheaper=None,note='CPI-U all items, seasonally adjusted (BLS CUSR0000SA0). Monthly; next release mid-month.'),
 card('sahm','Sahm rule',sahm,unit='pts',higherIsCheaper=None,note='3-mo avg unemployment minus its 12-mo low (BLS LNS14000000, current vintage, not FRED real-time). ≥ 0.50 has marked every US recession since 1970.'),
]
out={'built':dt.datetime.now().isoformat(timespec='seconds'),'canaries':canaries,'macro':macro,'cpiGaps':[d for d in [ym_back(list(cpi)[-1],z) for z in range(36)] if d not in cpi]}
json.dump(out,open(os.path.join(D,'preview.json'),'w'))
for kk,c in canaries.items(): print(kk,{a:b for a,b in c.items() if a not in('chart','backtest')}); print(json.dumps(c['backtest']))
for m in macro: print(m['key'],m['value'],m['asOf'],'chg',m['chg'],'mean',m['mean'],'med',m['median'],m['min'],m['max'],'below%',m['pctBelow'],'from',m['from'])
print('cpi gaps',out['cpiGaps'])
