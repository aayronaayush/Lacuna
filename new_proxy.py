# by Gabriel, to connect to DB
import pymysql.cursors
from os import path, listdir
from tempfile import gettempdir
from mitmproxy import http
import os
import binascii
import pickle
from bs4 import BeautifulSoup
import time
from urllib.parse import urlparse

# search for match in DB
connection = pymysql.connect(host='127.0.0.1',
                             user='root',
                             port=3306,
                             password='password',
                             db='deadcode',
                             autocommit=True)


requests = {}

def parseUrl(url):
    # Attempt to insert, there is a unique condition so if it faily, it fails
    parsedUrl = urlparse(url)
    if parsedUrl.path == '': 
        parsedUrl.path = "/" # Remove descrepancies between "/" and "" ending urls
    return parsedUrl.scheme + "://" + parsedUrl.netloc + parsedUrl.path
    

def request(flow: http.HTTPFlow) -> None:

    # store the request time
    requestUrl = flow.request.pretty_url.split("?")[0]
    requests[requestUrl] = time.time()
    flow.initiatingUrl = None
    flow.runningTest = False

    if "running-test" in flow.request.headers:
        flow.runningTest = True
        del flow.request.headers["running-test"]

    if "initiating-url" in flow.request.headers:
        try:
            with connection.cursor() as cursor:
                requestUrl = flow.request.pretty_url.split("?")[0]
                flow.initiatingUrl = parseUrl(flow.request.headers["initiating-url"])
                del flow.request.headers["initiating-url"]
                query_template_search = "SELECT headFilePath, updateFilePath, delay FROM cachedPages WHERE requestUrl = '{0}' AND initiatingUrl = '{1}'".format(requestUrl, flow.initiatingUrl)
                cursor.execute(query_template_search)
                sql_response = cursor.fetchone()
        finally:
            cursor.close()

        # return miss if not cache hit
        if not sql_response:
            #flow.response = http.HTTPResponse.make (200,"",{"Content-Type": "text/html"})
            return
        else:
            print ("--------- CACHE HIT {} -----------".format(requestUrl))

            with open(sql_response[1], 'rb') as temp_file:
                temp_content = temp_file.read()
                temp_file.close()

            with open(sql_response[0], 'rb') as temp_file:
                temp_headers = pickle.load(temp_file, encoding='latin1')

            code = 200
            if "x-ts" in temp_headers:
                code = int(temp_headers["x-ts"])

            headers_dict = {}
            for e in list(temp_headers):
                headers_dict[e] = temp_headers[e]

            # TODO: Validate content length
            if "Content-Length" in headers_dict:
                headers_dict["Content-Length"] = str(len(temp_content))

            flow.response = http.HTTPResponse.make (
                code,  # (optional) status code
                temp_content,  # (optional) content
                headers_dict)

            if requestUrl in requests:
                time_passed = int(int(sql_response[2])/1000.0 - (time.time()-requests[requestUrl])*1000)
                del requests[requestUrl]
                """
                if time_passed > 0:
                    print ("\n\n########## WAITING: {}\n\n".format(time_passed))
                    time.sleep(time_passed)
                """

            return

def response(flow: http.HTTPFlow) -> None:
    # randomize filename
    name = flow.request.pretty_url.split("?")[0]
    if flow.initiatingUrl:
        try:
            with connection.cursor() as cursor:
                requestUrl = flow.request.pretty_url.split("?")[0]

                query_template_search = query_template_search = "SELECT headFilePath, contFilePath, delay FROM cachedPages WHERE requestUrl = '{0}' AND initiatingUrl = '{1}'".format(requestUrl, flow.initiatingUrl)

                cursor.execute(query_template_search)
                sql_response = cursor.fetchone()

        finally:
            cursor.close()
            
        # if not hit, store the element in the DB, also check if we are not currently running the test
        if not sql_response and not flow.runningTest:

            try:
                ttt = flow.response.headers["Content-Type"].split(";")[0]
            except:
                ttt = "None"

            if name in requests:
                time_passed = int((time.time()-requests[name])*1000)
                del requests[name]
            else:
                time_passed = -1

            name = binascii.b2a_hex(os.urandom(15)).decode("utf-8")
            while os.path.exists("data/" + name):
                name = binascii.b2a_hex(os.urandom(15)).decode("utf-8")

            # modified by Gabriel: insert into DB

            header_path = "data/"+name+".h"
            content_path = "data/"+name+".c"
            update_path = "data/"+name+".u"

            try:
                with connection.cursor() as cursor:
                    query_template_insert = "INSERT INTO cachedPages (initiatingUrl, requestUrl, headFilePath, contFilePath, updateFilePath, type, delay) VALUES (%s, %s, %s, %s, %s, %s, %s)"
                    cursor.execute(query_template_insert,
                                   (flow.initiatingUrl, flow.request.pretty_url.split("?")[0], header_path, content_path, update_path, ttt, time_passed))

            finally:
                cursor.close()

            print ("\n\n--------- CACHE CLONE {} -----------\n\n".format(requestUrl))

            with open(header_path, 'wb') as temp_file:
                pickle.dump(flow.response.headers, temp_file)

            with open(content_path, 'wb') as temp_file:
                temp_file.write(flow.response.content)
                temp_file.close()


            with open(update_path, 'wb') as temp_file:
                temp_file.write(flow.response.content)
                temp_file.close()

    # end of insert of DB code
    return