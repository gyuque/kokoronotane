"""
 twneru2
 Copyright (C) 2010 Satoshi Ueyama <gyuque@gmail.com>

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as
 published by the Free Software Foundation, either version 3 of the
 License, or (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>.
"""

import os
import sys
from google.appengine.ext             import webapp
from google.appengine.ext.webapp      import template
from google.appengine.api             import memcache

class ServiceBase(webapp.RequestHandler):
  def remote_error(self, status, msg):
    print >>sys.stderr, "* Remote Server Error"
    print >>sys.stderr, "Status: " + str(status)
    print >>sys.stderr, "Message: " + msg
    self.response.set_status(500)

  def forbidden(self):
    self.response.set_status(403)
    self.response.out.write("403 Forbidden")

  def bad(self):
    self.response.set_status(400)
    self.response.out.write("400 Bad Request")

  def get(self):
    return

class PageBase(webapp.RequestHandler):
  def block_baidu(self):
    if self.request.headers:
      if 'User-Agent' in self.request.headers:
        if 'Baiduspider' in self.request.headers['User-Agent']:
          self.response.set_status(402)
          self.response.out.write("okane kudasai")
          print >>sys.stderr, "Denied Baiduspider"
          return True

    return False

  def is_iphone(self):
    if self.request.headers:
      if 'User-Agent' in self.request.headers:
        ua = self.request.headers['User-Agent']
        if ('(iPhone;' in ua) or ('(iPod;' in ua):
          return True

    return False

  def write_cached_page(self, cache_name, expire_in, template_file, params, content_type = None):
    content = memcache.get(cache_name)
    if content:
      if content_type:
        self.response.headers['Content-Type'] = content_type

      self.response.out.write(content)
      return

    content = self.write_page(template_file, params, content_type, True)
    memcache.set(cache_name, content, expire_in)

  def write_page(self, template_file, params, content_type = None, ret_html = False):
    path = os.path.join(os.path.dirname(__file__), template_file)
    if content_type:
      self.response.headers['Content-Type'] = content_type

    html = template.render(path, params)
    self.response.out.write(html)

    if ret_html:
      return html
