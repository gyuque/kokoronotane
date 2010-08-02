# coding: utf-8

import os
import sys
import wsgiref.handlers
from google.appengine.ext             import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext.webapp      import template
from google.appengine.api             import memcache
from google.appengine.ext             import db
from google.appengine.api.labs        import taskqueue
from google.appengine.api             import images

import handler_base as hbase

FIX_SIZE = 48

def log(s):
  print >>sys.stderr, s

# -- トップページ --
class LatentGeneratorPage(hbase.PageBase):
  def get(self):
    self.write_page("templates/latent.html", {})
    return

# -- 画像base64化 --
class ImageThroughService(hbase.ServiceBase):
  def post(self):
    import getimageinfo
    import base64

    img = self.request.get('image')
    t = getimageinfo.getImageInfo(img)
    if not t[0]: # invalid image
      self.bad()
      return

    if len(img) > (640*1024):
      self.bad()
      return

    conv_img = self.adjust_size(img, t[1], t[2])
#    bytes = db.Blob(conv_img)

    self.response.headers['Content-Type'] = 'text/html'
    self.response.out.write("<span id=\"imagedata\" style=\"display:none\">data:%s;base64,%s</span>" % ('image/png', base64.b64encode(conv_img)) )

    return

  def adjust_size(self, i, ow, oh):
    r = 1
    if FIX_SIZE == ow and FIX_SIZE == oh:
      return i

    w = FIX_SIZE
    h = FIX_SIZE
    if ow<oh:
      r = float(FIX_SIZE) / ow
      h = int(r*oh+0.5)
    else:
      r = float(FIX_SIZE) / oh
      w = int(r*ow+0.5)

    i1 = images.resize(i, w+1, h+1)
    ox = int((w-FIX_SIZE)/2.0)
    oy = int((h-FIX_SIZE)/2.0)

    return images.composite([(i1, -ox, -oy, 1.0, images.TOP_LEFT)], FIX_SIZE, FIX_SIZE)

# -- 初期化 --
def main():
  pro = False
  handlers = [
      ('/latent', LatentGeneratorPage),
      ('/latent/upload', ImageThroughService)
    ]

  application = webapp.WSGIApplication(handlers, debug = (not pro))
  run_wsgi_app(application)

if __name__ == "__main__":
  main()
