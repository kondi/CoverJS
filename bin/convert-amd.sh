#!/bin/bash
# slightly modified convert-amd.sh from prime framework 

path=`dirname $0`
SOURCE="$path/../"
if [ -z $1 ]; then
	DEST="$path/../amd"
else
	DEST=$1
fi

# create amd folder
if [ -d "$DEST" ]; then
	read -p "Are you sure you want to delete (and replace) '$DEST' (y/n)? "
	if [[ ! $REPLY == "y" ]]; then
		exit 1
	else
		echo "removed '$DEST'"
		rm -rf "$DEST";
	fi
fi

# create target directory (including parent directories)
mkdir -p "$DEST"

if [ ! -d "$DEST" ]; then
	echo "Could did not create the target directory '$DEST'"
	exit 1
else
	echo "created '$DEST'"
fi

# copy all files
cp -r "$SOURCE/lib" "$DEST/lib"
cp "$SOURCE/cover.js" "$DEST"

# wrap with define(function(){...})
for FILE in `find "$DEST" -name '*.js'`;
do
	JS="define(function(require, exports, module){
`cat "$FILE"`
});"
	# use -E option, to make sure \\ is not converted
	echo "$JS" > "$FILE"
done

echo "The converted AMD files are written to '$DEST'"

