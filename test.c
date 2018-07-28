#include <fcntl.h>
#include <emscripten.h>

int main(){
	int fd=open("/cvmfs/emscripten.cvmfs.io",O_RDONLY);
	return 0;
}