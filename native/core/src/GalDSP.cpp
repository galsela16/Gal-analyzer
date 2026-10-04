#include "GalDSP.h"
#include <algorithm>
#include <cmath>
#include <complex>
#include <vector>
namespace {
constexpr double pi=3.14159265358979323846;
bool validResolution(int bpo){return bpo==3||bpo==6||bpo==12||bpo==24||bpo==48;}
double db(double power){return 10*std::log10(std::max(power,1e-12));}
void fft(std::vector<std::complex<double>>& data){
 const size_t n=data.size();
 for(size_t i=1,j=0;i<n;i++){size_t bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j)std::swap(data[i],data[j]);}
 for(size_t width=2;width<=n;width<<=1){
  const auto step=std::polar(1.0,-2*pi/width);
  for(size_t start=0;start<n;start+=width){std::complex<double> w=1;for(size_t k=0;k<width/2;k++){const auto a=data[start+k],b=w*data[start+k+width/2];data[start+k]=a+b;data[start+k+width/2]=a-b;w*=step;}}
 }
}
}
size_t gal_band_count(int bpo){return validResolution(bpo)?size_t(std::round(std::log2(20000.0/20)*bpo))+1:0;}
int gal_analyze(const float *samples,size_t count,double sampleRate,int bpo,
                double *frequencies,double *levels,size_t capacity,GalAnalysis *result){
 const size_t bands=gal_band_count(bpo);
 if(!samples||!frequencies||!levels||!result||!bands||capacity<bands||count<16||count>(1u<<20)||(count&(count-1))||!std::isfinite(sampleRate)||sampleRate<40000||sampleRate>192000)return -1;
 std::vector<std::complex<double>> spectrum(count);
 double sumSquares=0,peak=0,windowEnergy=0;
 for(size_t i=0;i<count;i++){
  const double value=std::isfinite(samples[i])?samples[i]:0;
  const double window=.5-.5*std::cos(2*pi*i/(count-1));
  sumSquares+=value*value;peak=std::max(peak,std::abs(value));windowEnergy+=window*window;spectrum[i]=value*window;
 }
 fft(spectrum);
 const size_t bins=count/2+1;const double binHz=sampleRate/count,nyquist=sampleRate/2;
 std::vector<double> power(bins);
 for(size_t i=0;i<bins;i++)power[i]=std::norm(spectrum[i])*(i==0||i==count/2?1:2)/(count*windowEnergy);
 const double ratio=std::pow(2,1.0/(2*bpo));
 for(size_t band=0;band<bands;band++){
  const double frequency=20*std::pow(2,double(band)/bpo);
  frequencies[band]=frequency;
  const double lo=std::max(0.0,frequency/ratio),hi=std::min(nyquist,frequency*ratio);
  double integrated=0;
  if(hi>lo){
   const size_t first=size_t(std::max(0.0,std::floor(lo/binHz-.5))),last=size_t(std::min(double(bins-1),std::ceil(hi/binHz+.5)));
   for(size_t bin=first;bin<=last;bin++){
    const double binLo=std::max(0.0,(double(bin)-.5)*binHz),binHi=std::min(nyquist,(double(bin)+.5)*binHz);
    const double overlap=std::max(0.0,std::min(hi,binHi)-std::max(lo,binLo));
    if(overlap>0)integrated+=power[bin]*overlap/(binHi-binLo);
   }
  }
  levels[band]=db(integrated);
 }
 result->rms_dbfs=db(sumSquares/count);result->peak_dbfs=db(peak*peak);result->band_count=bands;return 0;
}
