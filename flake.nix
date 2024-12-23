{ description = "some ts-deno";
  inputs = {
    flake-utils.url = "github:numtide/flake-utils/ff7b65b44d01cf9ba6a71320833626af21126384";
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        buildInputs = [ pkgs.deno  ];
      in rec {
        devShell = pkgs.mkShell { inherit buildInputs; };
        packages.combine_vid = pkgs.writeScriptBin "combine_vid" ''
          ${pkgs.deno}/bin/deno -A ${./main.ts} "$@"
        '';
        packages.default = packages.combine_vid;
      });
}
