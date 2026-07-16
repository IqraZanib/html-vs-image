import base64, os
os.chdir('/home/orenda/html-vs-image')

def b(p):
    return 'data:image/png;base64,' + base64.b64encode(open('assets/illustrations/' + p, 'rb').read()).decode()

ali = b('ali-ref.png'); sara = b('sara-ref.png'); teacher = b('ref-teacher.png')
housesido = b('ref-houses-ido.png'); school = b('ref-school.png')
houses = b('ref-houses.png'); park = b('ref-park.png'); painting = b('ref-painting.png')
tree = b('ref-treecard.png'); paintingbig = b('ref-paintingbig.png')
schoolbus = b('ref-schoolbus.png'); bench = b('ref-bench.png')

h = open('references/samples/pinky-day-out-sindhi.html', encoding='utf-8').read()

def rep(old, new, n=1):
    global h
    c = h.count(old)
    assert c == n, 'expected %d got %d for: %s' % (n, c, old[:60])
    h = h.replace(old, new)

rep('<div class="icon-frame"><svg viewBox="0 0 100 100" width="70" height="70"><use href="#char-ali"/></svg></div>',
    '<img class="charimg" src="%s" alt="Ali">' % ali)
rep('<div class="icon-frame"><svg viewBox="0 0 100 100" width="70" height="70"><use href="#char-sara"/></svg></div>',
    '<img class="charimg" src="%s" alt="Sara">' % sara)
rep('<div class="icon-frame"><svg viewBox="0 0 100 100" width="34" height="34"><use href="#char-sara"/></svg></div>',
    '<img class="refscene s-ido" src="%s">' % teacher)
rep('<div class="icon-frame"><svg viewBox="0 0 120 100" width="40" height="34"><use href="#scn-school"/></svg></div>',
    '<img class="refscene s-ido" src="%s">' % housesido)
rep('<div class="icon-frame"><svg viewBox="0 0 140 100" width="40" height="30"><use href="#scn-park"/></svg></div>',
    '<img class="refscene s-ido" src="%s">' % school)
rep('<div class="icon-frame"><svg viewBox="0 0 120 100" width="30" height="26"><use href="#scn-school"/></svg></div>',
    '<img class="refscene s-board" src="%s">' % houses)
rep('<div class="icon-frame"><svg viewBox="0 0 140 100" width="30" height="22"><use href="#scn-park"/></svg></div>',
    '<img class="refscene s-board" src="%s">' % park)
rep('<div class="icon-frame"><svg viewBox="0 0 120 110" width="28" height="26"><use href="#scn-painting"/></svg></div>',
    '<img class="refscene s-board" src="%s">' % painting)
rep('<div class="ex-illustration"><svg viewBox="0 0 40 50" width="100%" ><use href="#ic-tree"/></svg></div>',
    '<div class="ex-illustration"><img class="refscene" style="width:100%%" src="%s"></div>' % tree)
rep('<svg viewBox="0 0 40 50"><use href="#ic-tree"/></svg>', '<img class="reftree" src="%s">' % tree, n=3)
rep('<div class="icon-frame"><svg viewBox="0 0 64 64" width="34" height="34"><use href="#ic-palette"/></svg></div>',
    '<img class="refscene s-card" src="%s">' % paintingbig)
rep('<div class="icon-frame"><svg viewBox="0 0 64 64" width="34" height="34"><use href="#ic-schoolbus"/></svg></div>',
    '<img class="refscene s-card" src="%s">' % schoolbus)
rep('<div class="icon-frame"><svg viewBox="0 0 64 64" width="34" height="34"><use href="#ic-swingset"/></svg></div>',
    '<img class="refscene s-card" src="%s">' % bench)

css = (
    "\n.charimg{width:26mm;height:auto;display:block;margin:0 auto 1mm}"
    "\n.refscene{display:block;object-fit:contain;border-radius:6px}"
    "\n.s-ido{width:20mm;height:auto}"
    "\n.s-board{width:26mm;height:auto;margin:1mm auto}"
    "\n.s-card{width:26mm;height:auto;margin:0 auto}"
    "\n.reftree{width:18mm;height:auto;display:inline-block}"
    "\n.board-item{background:transparent;color:#fff;box-shadow:none}"
    "\n.board-item .q{color:#fff}"
    "\n.board-item .a{color:#ffd966}"
    "\n.board-item .a b{color:#fff}\n</style>"
)
h = h.replace('</style>', css)
open('references/samples/pinky-day-out-full.html', 'w', encoding='utf-8').write(h)
print('written pinky-day-out-full.html', len(h))
