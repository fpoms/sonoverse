from flask import Flask
from flask_cors import CORS, cross_origin

import bempp.api


app = Flask(__name__)
CORS(app) # allow CORS for all domains on all routes.
app.config['CORS_HEADERS'] = 'Content-Type'

@app.route("/api/grid")
def hello_world():
    grid = bempp.api.shapes.cube(length=3, h=0.1)
    print(grid.vertices.shape)
    return {
        "vertices": grid.vertices.transpose(1, 0).flatten().tolist(),
        "indices": grid.elements.transpose(1, 0).flatten().tolist()
    }