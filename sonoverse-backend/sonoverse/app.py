import json
json.encoder.FLOAT_REPR = lambda x: format(x, '.10f')

from flask import Flask
from flask_cors import CORS, cross_origin

import bempp.api
import numpy as np
from bempp.api.linalg import gmres


app = Flask(__name__)
CORS(app) # allow CORS for all domains on all routes.
app.config['CORS_HEADERS'] = 'Content-Type'

@app.route("/api/grid")
def hello_world():
    # Form and solve helmholtz acoustic problem
    k = 15.0
    grid = bempp.api.shapes.sphere(r=1, h=0.5)
    #grid = bempp.api.shapes.cube(length=1, h=0.5)
    piecewise_const_space = bempp.api.function_space(grid, "DP", 0)
    identity = bempp.api.operators.boundary.sparse.identity(
        piecewise_const_space, piecewise_const_space, piecewise_const_space
    )
    adlp = bempp.api.operators.boundary.helmholtz.adjoint_double_layer(
        piecewise_const_space, piecewise_const_space, piecewise_const_space, k
    )
    slp = bempp.api.operators.boundary.helmholtz.single_layer(
        piecewise_const_space, piecewise_const_space, piecewise_const_space, k
    )
    lhs = 0.5 * identity + adlp - 1j * k * slp

    @bempp.api.complex_callable
    def combined_data(x, n, domain_index, result):
        result[0] = 1j * k * np.exp(1j * k * x[0]) * (n[0] - 1)

    grid_fun = bempp.api.GridFunction(piecewise_const_space, fun=combined_data)
    neumann_fun, info = gmres(lhs, grid_fun, tol=1e-5)

    # Produce domain of points to evaluate over
    Nx = 400
    Ny = 400
    xmin, xmax, ymin, ymax = [-3, 3, -3, 3]
    plot_grid = np.mgrid[xmin : xmax : Nx * 1j, ymin : ymax : Ny * 1j]
    points = np.vstack((plot_grid[0].ravel(), plot_grid[1].ravel(), np.zeros(plot_grid[0].size)))
    u_evaluated = np.zeros(points.shape[1], dtype=np.complex128)
    u_evaluated[:] = np.nan

    x, y, z = points
    idx = np.sqrt(x**2 + y**2) > 1.0

    # Evaluate domain points
    from bempp.api.operators.potential import helmholtz as helmholtz_potential

    slp_pot = helmholtz_potential.single_layer(piecewise_const_space, points[:, idx], k)
    res = np.real(np.exp(1j * k * points[0, idx]) - slp_pot.evaluate(neumann_fun))
    u_evaluated[idx] = res.flat
    print('u_evaluated', u_evaluated.shape)
    print('res', res.shape)

    print(info)
    print(grid.vertices.shape)
    return {
        "vertices": grid.vertices.transpose(1, 0).flatten().tolist(),
        "indices": grid.elements.transpose(1, 0).flatten().tolist(),
        "evaluated": {
            "x_bounds": [xmin, xmax],
            "y_bounds": [ymin, ymax],
            "width": Nx,
            "height": Ny,
            "z": 0,
            "result": [f"{x:.6f}" for x in np.real(u_evaluated.T).tolist()]
        }
    }